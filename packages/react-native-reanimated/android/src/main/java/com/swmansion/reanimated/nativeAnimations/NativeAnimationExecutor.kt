package com.swmansion.reanimated.nativeAnimations

import android.animation.TimeInterpolator
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.Message
import android.view.View
import android.view.animation.AnimationUtils
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.uimanager.IllegalViewOperationException
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.UIManagerHelper
import com.swmansion.reanimated.BuildConfig
import java.lang.ref.WeakReference
import java.util.WeakHashMap
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.max

/**
 * Plays the tracks of the native animation host: one `ValueAnimator` per track, which writes the view
 * property that React Native writes, or the animation matrix of the view for its geometry. The C++ platform
 * calls it; all track state is on the UI thread.
 */
internal class NativeAnimationExecutor(
    private val fabricUIManager: FabricUIManager,
    private val reactContext: WeakReference<ReactApplicationContext>,
    /** Reanimated's clock at a time of `SystemClock.uptimeMillis()`. */
    private val animationTimestampOf: (Long) -> Long,
    /** Runs a call into C++ only while the C++ state lives, and holds that state for the time of the call. */
    private val nativeCallGuard: (() -> Unit) -> Unit,
) {
    @Volatile
    private lateinit var callbacks: NativeAnimationPlatformCallbacks

    private val playbacks = HashMap<TrackKey, TrackPlayback>()
    private val geometryWriters = WeakHashMap<View, GeometryWriter>()
    private val timingCache = TimingCache()
    private val reconciler = PreDrawReconciler(::onPreDraw)

    @Volatile
    private var invalidated = false

    /** How many times slower Reanimated's clock runs than the animator's while slow animations are on. */
    private var slowAnimationsDragFactor = 1.0

    /**
     * React can overwrite an animated value only on frames where it wrote props, so the
     * pre-draw repair is skipped on all others.
     */
    private var fabricWroteSinceLastDraw = true

    private val drainPending = AtomicBoolean(false)
    private val mainHandler = Handler(Looper.getMainLooper())
    private val drainRunnable = Runnable { drainIfPending() }

    /** JS thread, once, before the first host operation. */
    @DoNotStrip
    fun setCallbacks(callbacks: NativeAnimationPlatformCallbacks) {
        this.callbacks = callbacks
    }

    /** Any thread. */
    @DoNotStrip
    fun animatorsEnabled(): Boolean {
        val context = reactContext.get() ?: return false
        return DurationScale.effectiveScale(context) > 0f
    }

    @DoNotStrip
    fun findView(
        surfaceId: Int,
        tag: Int,
    ): View? {
        UiThreadUtil.assertOnUiThread()
        return viewOf(tag)?.takeIf { UIManagerHelper.getSurfaceId(it) == surfaceId }
    }

    @DoNotStrip
    fun isInWindow(
        surfaceId: Int,
        tag: Int,
    ): Boolean = findView(surfaceId, tag)?.isAttachedToWindow == true

    /** The model value of the target that the view holds, or that the record of its active track keeps. */
    @DoNotStrip
    fun modelOf(
        view: View,
        target: Int,
    ): DoubleArray {
        UiThreadUtil.assertOnUiThread()
        if (target == TrackEncoding.TARGET_OPACITY) {
            return doubleArrayOf(opacityBindingOf(view)?.model ?: view.alpha.toDouble())
        }
        return mountedGeometryModelOf(view, target, density)
            ?: trackWriterFor(target)?.let { writer -> writer.readVisual(view)?.let(writer::sampleComponentsOf) }
            ?: DoubleArray(0)
    }

    /** In a mount report: the mount gave the model of the target of the track the value [value]. */
    @DoNotStrip
    fun setModel(
        surfaceId: Int,
        tag: Int,
        owner: Int,
        generation: Long,
        target: Int,
        value: Double,
    ) {
        UiThreadUtil.assertOnUiThread()
        if (invalidated) return
        (playbacks[TrackKey(surfaceId, tag, owner, generation, target)]?.binding as? OpacityBinding)?.model = value
    }

    /** A synchronous props update wrote [opacity] to the view of the tag. */
    fun setOpacityModel(
        tag: Int,
        opacity: Double,
    ) {
        UiThreadUtil.assertOnUiThread()
        playbacks.values
            .filter { it.key.tag == tag }
            .forEach { (it.binding as? OpacityBinding)?.model = opacity }
    }

    @DoNotStrip
    fun prepare(
        view: View,
        surfaceId: Int,
        tag: Int,
        owner: Int,
        generation: Long,
        passTimestampMs: Double,
        originTimestampMs: Double,
        interruptedTargets: IntArray,
        trackInts: IntArray,
        trackDoubles: DoubleArray,
    ): Preparation {
        UiThreadUtil.assertOnUiThread()
        val context = reactContext.get()
        val scale = if (invalidated || context == null) 0f else DurationScale.effectiveScale(context)
        if (scale <= 0f) return PreparationRejection(TrackEncoding.REASON_UNSUPPORTED_REALIZATION)

        val starts = ArrayList<TrackStart>()
        for (spec in TrackBufferParser(trackInts, trackDoubles).parse()) {
            val binding =
                bindingOf(spec, view) ?: return PreparationRejection(TrackEncoding.REASON_UNSUPPORTED_REALIZATION)
            val startValue =
                startValueOf(spec, view, spec.target in interruptedTargets)
                    ?: return PreparationRejection(TrackEncoding.REASON_CURRENT_VALUE_UNAVAILABLE)
            starts.add(TrackStart(spec, binding, startValue))
        }

        val start = StartTime(passTimestampMs, originTimestampMs, leadMsAt(originTimestampMs))
        val tracks = ArrayList<TrackPlayback>(starts.size)
        try {
            for (trackStart in starts) {
                val key = TrackKey(surfaceId, tag, owner, generation, trackStart.spec.target)
                tracks.add(playbackOf(key, view, trackStart, start, scale))
            }
        } catch (e: IllegalArgumentException) {
            tracks.forEach { it.timeline.release(timingCache) }
            return PreparationRejection(TrackEncoding.REASON_UNSUPPORTED_REALIZATION)
        }
        return PreparedPlayback(this, tracks)
    }

    /**
     * [inDispatch]: the stop runs in the mount dispatch of its pull, after the mount items that gave the model
     * its value.
     */
    @DoNotStrip
    fun stop(
        surfaceId: Int,
        tag: Int,
        owner: Int,
        generation: Long,
        target: Int,
        mode: Int,
        inDispatch: Boolean,
    ) {
        UiThreadUtil.assertOnUiThread()
        val playback = remove(TrackKey(surfaceId, tag, owner, generation, target)) ?: return
        if (mode != TrackEncoding.STOP_SETTLE_TO_MODEL || inDispatch) return
        val view = playback.view.get()
        if (view == null || findView(surfaceId, tag) !== view) return
        when (val binding = playback.binding) {
            is OpacityBinding -> binding.writeModel(view)
            is PropertyBinding ->
                if (BuildConfig.DEBUG) {
                    error("[Reanimated] A SettleToModel stop of a live view needs its model value, and the Android executor has none.")
                }
            else -> Unit
        }
    }

    /** Any thread. */
    @DoNotStrip
    fun requestDrain() {
        if (invalidated || !drainPending.compareAndSet(false, true)) return
        // Asynchronous, so a traversal's sync barrier cannot defer it past the frame whose
        // committed values the operations are meant to replace.
        mainHandler.sendMessage(Message.obtain(mainHandler, drainRunnable).apply { isAsynchronous = true })
    }

    @DoNotStrip
    fun sample(
        tag: Int,
        target: Int,
    ): NativeAnimationSample? {
        UiThreadUtil.assertOnUiThread()
        val view = viewOf(tag) ?: return null
        val onView = playbacks.values.filter { it.view.get() === view }
        val member = onView.firstOrNull { it.key.target == target }
        return NativeAnimationSample(
            model = modelOf(view, target),
            presentation = presentationOf(view, target),
            playbacks = onView.flatMap { it.key.toLongs().asList() }.toLongArray(),
            members = member?.let(::membersOf) ?: emptyArray(),
        )
    }

    /** Fabric wrote props to the views: in a mount, or in a synchronous props update. */
    fun markFabricWrite() {
        UiThreadUtil.assertOnUiThread()
        fabricWroteSinceLastDraw = true
    }

    fun enableSlowAnimations(
        slowAnimationsEnabled: Boolean,
        animationsDragFactor: Int,
    ) {
        slowAnimationsDragFactor = if (slowAnimationsEnabled) animationsDragFactor.toDouble() else 1.0
    }

    /** Any thread. Animators keep ticking on their own, so a dead context has to stop them. */
    fun invalidate() {
        invalidated = true
        mainHandler.post {
            val running = playbacks.values.toList()
            playbacks.clear()
            running.forEach { it.animator.cancel() }
            geometryWriters.clear()
            reconciler.invalidate()
            timingCache.clear()
            drainPending.set(false)
        }
    }

    /** UI thread, from `PreparedPlayback.install`, in one call with no frame between the replacement and the starts. */
    internal fun install(
        replacedTracks: List<TrackKey>,
        tracks: List<TrackPlayback>,
    ) {
        UiThreadUtil.assertOnUiThread()
        replacedTracks.forEach(::remove)
        for (playback in tracks) {
            playbacks[playback.key] = playback
            playback.start()
            playback.view.get()?.let(reconciler::track)
        }
    }

    private class TrackStart(
        val spec: TrackSpec,
        val binding: TrackBinding,
        val startValue: DoubleArray,
    )

    /** The times of one request on Reanimated's clock. The tracks hold their start value for [leadMs] before the origin. */
    private class StartTime(
        val passTimestampMs: Double,
        val originTimestampMs: Double,
        val leadMs: Double,
    ) {
        val elapsedMs: Double
            get() = passTimestampMs - originTimestampMs
    }

    /** The first animator frame of a start comes at the animation time of now or later. */
    private fun leadMsAt(originTimestampMs: Double): Double =
        max(0.0, originTimestampMs - animationTimestampOf(AnimationUtils.currentAnimationTimeMillis()))

    private val density: Float
        get() = PixelUtil.getDisplayMetricDensity()

    private fun bindingOf(
        spec: TrackSpec,
        view: View,
    ): TrackBinding? =
        when {
            spec.binding == TrackEncoding.BINDING_HOLD -> HoldBinding
            spec.target == TrackEncoding.TARGET_OPACITY -> OpacityBinding(firstOpacityModelOf(spec, view))
            isGeometryTarget(spec.target) -> geometryBindingOf(spec, view)
            else -> trackWriterFor(spec.target)?.let(::PropertyBinding)
        }

    private fun firstOpacityModelOf(
        spec: TrackSpec,
        view: View,
    ): Double =
        if (spec.endpointPolicy == TrackEncoding.ENDPOINT_POLICY_EXECUTOR_COMMITS_ENDPOINT) {
            spec.timelines
                .single()
                .segments
                .last()
                .endValue[0]
        } else {
            modelOf(view, spec.target)[0]
        }

    private fun geometryBindingOf(
        spec: TrackSpec,
        view: View,
    ): TrackBinding? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return null
        val writer = geometryWriters.getOrPut(view) { GeometryWriter(density) }
        return if (spec.target == TrackEncoding.TARGET_TRANSFORM) {
            GeometryBinding(writer, spec.target, spec.operations, 0f)
        } else {
            GeometryBinding(writer, spec.target, IntArray(0), mountedCentrePx(view, spec.target))
        }
    }

    private fun opacityBindingOf(view: View): OpacityBinding? =
        playbacks.values.firstNotNullOfOrNull { playback ->
            (playback.binding as? OpacityBinding)?.takeIf { playback.view.get() === view }
        }

    private fun presentationOf(
        view: View,
        target: Int,
    ): DoubleArray {
        val model = mountedGeometryModelOf(view, target, density)
        val writer = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) geometryWriters[view] else null
        return when {
            model == null -> trackWriterFor(target)?.let { it.readVisual(view)?.let(it::sampleComponentsOf) } ?: DoubleArray(0)
            writer == null -> model
            target == TrackEncoding.TARGET_TRANSFORM -> writer.transformCells() ?: model
            target == TrackEncoding.TARGET_POSITION_X || target == TrackEncoding.TARGET_POSITION_Y ->
                doubleArrayOf(model[0] + writer.offsetPoints(target))
            target == TrackEncoding.TARGET_POSITION ->
                doubleArrayOf(
                    model[0] + writer.offsetPoints(TrackEncoding.TARGET_POSITION_X),
                    model[1] + writer.offsetPoints(TrackEncoding.TARGET_POSITION_Y),
                )
            else -> model
        }
    }

    private fun membersOf(playback: TrackPlayback): Array<NativeAnimationMember> =
        playback.timeline.components
            .mapIndexed { index, component ->
                val values = component.values.map(playback.binding::sampleComponentsOf)
                NativeAnimationMember(
                    property = playback.binding.memberProperty(index),
                    componentCount = values.first().size,
                    values = values.flatMap { it.asList() }.toDoubleArray(),
                    keyTimes = doubleArrayOf(0.0, *component.endOffsets),
                )
            }.toTypedArray()

    private fun isGeometryTarget(target: Int) =
        target == TrackEncoding.TARGET_POSITION_X ||
            target == TrackEncoding.TARGET_POSITION_Y ||
            target == TrackEncoding.TARGET_TRANSFORM

    private fun viewOf(tag: Int): View? =
        try {
            fabricUIManager.resolveView(tag)
        } catch (e: IllegalViewOperationException) {
            // Thrown, not null, when the tag is registered but the View does not exist.
            null
        }

    private fun startValueOf(
        spec: TrackSpec,
        view: View,
        isInterrupting: Boolean,
    ): DoubleArray? =
        when {
            spec.startForm == TrackEncoding.START_VALUE -> spec.startValue
            spec.startForm == TrackEncoding.START_CURRENT_VISUAL_VALUE || isInterrupting ->
                trackWriterFor(spec.target)?.readVisual(view) ?: lastAppliedValueOf(view, spec.target)
            else -> spec.startValue
        }

    /** The value that the interrupted track of the target last wrote to the view. */
    private fun lastAppliedValueOf(
        view: View,
        target: Int,
    ): DoubleArray? =
        playbacks.values
            .firstOrNull { it.key.target == target && it.hasApplied && it.view.get() === view }
            ?.value
            ?.copyOf()

    /** Throws IllegalArgumentException for a timing that the platform refuses. */
    private fun playbackOf(
        key: TrackKey,
        view: View,
        trackStart: TrackStart,
        start: StartTime,
        scale: Float,
    ): TrackPlayback {
        val spec = trackStart.spec
        val totalMs = spec.delayMs + spec.durationMs
        val animatedMs = start.leadMs + totalMs
        // startDelay writes nothing while it waits, so a commit in the delay would stay on
        // screen. Folding the lead and the delay into the timeline rewrites the property instead.
        val holdFraction = if (animatedMs > 0) ((start.leadMs + spec.delayMs) / animatedMs).toFloat() else 0f
        val alignment =
            if (animatedMs > 0) {
                AnimatorAlignment(start.originTimestampMs - start.leadMs, animatedMs, animationTimestampOf)
            } else {
                null
            }
        return TrackPlayback(
            key = key,
            view = view,
            binding = trackStart.binding,
            timeline = timelineOf(spec, trackStart.startValue, holdFraction),
            holdsEndValue = spec.endpointPolicy == TrackEncoding.ENDPOINT_POLICY_HOLD_WITHOUT_COMMIT,
            endsAtModel = spec.endpointPolicy == TrackEncoding.ENDPOINT_POLICY_MOUNTED_MODEL_MUST_MATCH_ENDPOINT,
            startValue = trackStart.startValue,
            animatorDurationMs = (animatedMs * slowAnimationsDragFactor / scale).toLong().coerceAtLeast(1L),
            seekFraction = alignment?.fractionAt(start.passTimestampMs)?.takeIf { it > 0f },
            writesStartValue = start.elapsedMs < totalMs,
            alignment = alignment,
            onEnd = ::onAnimationEnd,
        )
    }

    private fun timelineOf(
        spec: TrackSpec,
        startValue: DoubleArray,
        holdFraction: Float,
    ): Timeline {
        val timingKeys = spec.timelines.flatMap { timeline -> timeline.segments.map { it.timing } }
        val timings = ArrayList<TimeInterpolator>(timingKeys.size)
        try {
            timingKeys.forEach { timings.add(timingCache.acquire(it)) }
        } catch (e: IllegalArgumentException) {
            timingKeys.take(timings.size).forEach(timingCache::release)
            throw e
        }
        val interpolation = slotInterpolationOf(spec.target)
        var firstTiming = 0
        val components =
            spec.timelines.mapIndexed { index, timeline ->
                val slot = index * spec.componentCount
                val segmentCount = timeline.segments.size
                ComponentTimeline(
                    slot = slot,
                    values =
                        listOf(startValue.copyOfRange(slot, slot + spec.componentCount)) + timeline.segments.map { it.endValue },
                    endOffsets = timeline.segments.map { it.endOffset }.toDoubleArray(),
                    timings = timings.subList(firstTiming, firstTiming + segmentCount),
                    timingKeys = timingKeys.subList(firstTiming, firstTiming + segmentCount),
                    interpolation = interpolation,
                ).also { firstTiming += segmentCount }
            }
        return Timeline(components, holdFraction)
    }

    /** A writer of a view property blends its whole value; each other slot is one scalar. */
    private fun slotInterpolationOf(target: Int): SlotInterpolation =
        trackWriterFor(target)?.let { writer ->
            SlotInterpolation { from, to, progress, value, _ -> writer.interpolate(from, to, progress, value) }
        } ?: SCALAR_SLOT

    private fun onAnimationEnd(playback: TrackPlayback) {
        // The animator can post a natural end after the record left the map.
        if (playbacks[playback.key] !== playback) return
        if (!playback.holdsEndValue) {
            playbacks.remove(playback.key)
            playback.view.get()?.let(playback.binding::release)
            playback.timeline.release(timingCache)
        }
        val key = playback.key
        nativeCallGuard { callbacks.onTrackEnded(key.surfaceId, key.tag, key.owner, key.generation, key.target, true) }
    }

    private fun remove(key: TrackKey): TrackPlayback? {
        val playback = playbacks.remove(key) ?: return null
        playback.animator.cancel()
        playback.view.get()?.let(playback.binding::release)
        playback.timeline.release(timingCache)
        return playback
    }

    /**
     * Draining here as well as from the posted message puts a queued start after the commit
     * that wrote the target and before the draw, so it replaces the target in the same frame
     * rather than showing it once. Returns whether the listener is still needed.
     */
    private fun onPreDraw(): Boolean {
        drainIfPending()
        repairOverwrittenValues()
        return !invalidated
    }

    private fun drainIfPending() {
        if (drainPending.compareAndSet(true, false)) nativeCallGuard { callbacks.drainPostedOperations() }
    }

    /** Re-asserts the value of each track wherever a commit overwrote it. */
    private fun repairOverwrittenValues() {
        if (!fabricWroteSinceLastDraw) return
        fabricWroteSinceLastDraw = false
        playbacks.values.forEach(TrackPlayback::reassert)
    }
}
