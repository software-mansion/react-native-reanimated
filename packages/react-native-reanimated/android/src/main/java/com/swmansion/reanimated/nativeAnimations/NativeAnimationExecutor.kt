package com.swmansion.reanimated.nativeAnimations

import android.animation.TimeInterpolator
import android.os.Handler
import android.os.Looper
import android.os.Message
import android.view.View
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.uimanager.IllegalViewOperationException
import com.facebook.react.uimanager.UIManagerHelper
import com.swmansion.reanimated.BuildConfig
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.max

/**
 * Plays the tracks of the native animation host: one `ValueAnimator` per track, which writes the view
 * property that React Native writes. The C++ platform calls it; all track state is on the UI thread.
 */
internal class NativeAnimationExecutor(
    private val fabricUIManager: FabricUIManager,
    private val reactContext: WeakReference<ReactApplicationContext>,
    /** Runs a call into C++ only while the C++ state lives, and holds that state for the time of the call. */
    private val nativeCallGuard: (() -> Unit) -> Unit,
) {
    @Volatile
    private lateinit var callbacks: NativeAnimationPlatformCallbacks

    private val playbacks = HashMap<TrackKey, TrackPlayback>()
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
    fun isInWindow(tag: Int): Boolean {
        UiThreadUtil.assertOnUiThread()
        return viewOf(tag)?.isAttachedToWindow == true
    }

    @DoNotStrip
    fun prepare(
        view: View,
        surfaceId: Int,
        tag: Int,
        owner: Int,
        generation: Long,
        elapsedMs: Double,
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
            val writer =
                trackWriterFor(spec.target) ?: return PreparationRejection(TrackEncoding.REASON_UNSUPPORTED_REALIZATION)
            val startValue =
                startValueOf(spec, writer, view, spec.target in interruptedTargets)
                    ?: return PreparationRejection(TrackEncoding.REASON_CURRENT_VALUE_UNAVAILABLE)
            starts.add(TrackStart(spec, writer, startValue))
        }

        val tracks = ArrayList<TrackPlayback>(starts.size)
        try {
            for (start in starts) {
                val key = TrackKey(surfaceId, tag, owner, generation, start.spec.target)
                tracks.add(playbackOf(key, view, start, elapsedMs, scale))
            }
        } catch (e: IllegalArgumentException) {
            tracks.forEach { it.timeline.release(timingCache) }
            return PreparationRejection(TrackEncoding.REASON_UNSUPPORTED_REALIZATION)
        }
        return PreparedPlayback(this, tracks)
    }

    @DoNotStrip
    fun stop(
        surfaceId: Int,
        tag: Int,
        owner: Int,
        generation: Long,
        target: Int,
        mode: Int,
    ) {
        UiThreadUtil.assertOnUiThread()
        val playback = remove(TrackKey(surfaceId, tag, owner, generation, target)) ?: return
        if (BuildConfig.DEBUG && mode == TrackEncoding.STOP_SETTLE_TO_MODEL) {
            val view = playback.view.get()
            check(view == null || findView(surfaceId, tag) !== view) {
                "[Reanimated] A SettleToModel stop of a live view needs its model value, and the Android executor has none."
            }
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
        val writer = trackWriterFor(target)
        val shown = writer?.readVisual(view)?.let(writer::sampleComponentsOf) ?: DoubleArray(0)
        val member = onView.firstOrNull { it.key.target == target }
        return NativeAnimationSample(
            model = shown,
            presentation = shown,
            playbacks = onView.flatMap { it.key.toLongs().asList() }.toLongArray(),
            memberProperty = member?.writer?.property,
            memberComponentCount = member?.let { it.writer.sampleComponentsOf(it.value).size } ?: 0,
            memberValues =
                member?.let { playback ->
                    playback.timeline.values.flatMap { playback.writer.sampleComponentsOf(it).asList() }.toDoubleArray()
                } ?: DoubleArray(0),
            memberKeyTimes = member?.let { doubleArrayOf(0.0, *it.timeline.endOffsets) } ?: DoubleArray(0),
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
        val writer: TrackWriter,
        val startValue: DoubleArray,
    )

    private fun viewOf(tag: Int): View? =
        try {
            fabricUIManager.resolveView(tag)
        } catch (e: IllegalViewOperationException) {
            // Thrown, not null, when the tag is registered but the View does not exist.
            null
        }

    private fun startValueOf(
        spec: TrackSpec,
        writer: TrackWriter,
        view: View,
        isInterrupting: Boolean,
    ): DoubleArray? =
        when {
            spec.startForm == TrackEncoding.START_VALUE -> spec.startValue
            spec.startForm == TrackEncoding.START_CURRENT_VISUAL_VALUE || isInterrupting ->
                writer.readVisual(view) ?: lastAppliedValueOf(view, spec.target)
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
        start: TrackStart,
        elapsedMs: Double,
        scale: Float,
    ): TrackPlayback {
        val spec = start.spec
        val leadMs = max(0.0, -elapsedMs)
        val totalMs = spec.delayMs + spec.durationMs
        val animatedMs = leadMs + totalMs
        // startDelay writes nothing while it waits, so a commit in the delay would stay on
        // screen. Folding the lead and the delay into the timeline rewrites the property instead.
        val holdFraction = if (animatedMs > 0) ((leadMs + spec.delayMs) / animatedMs).toFloat() else 0f
        return TrackPlayback(
            key = key,
            view = view,
            writer = start.writer,
            timeline = timelineOf(spec, start.writer, start.startValue, holdFraction),
            holdsEndValue = spec.endpointPolicy == TrackEncoding.ENDPOINT_POLICY_HOLD_WITHOUT_COMMIT,
            startValue = start.startValue,
            animatorDurationMs = (animatedMs * slowAnimationsDragFactor / scale).toLong().coerceAtLeast(1L),
            seekFraction = if (elapsedMs > 0 && totalMs > 0) (elapsedMs / totalMs).toFloat().coerceIn(0f, 1f) else null,
            writesStartValue = elapsedMs < totalMs,
            onEnd = ::onAnimationEnd,
        )
    }

    private fun timelineOf(
        spec: TrackSpec,
        writer: TrackWriter,
        startValue: DoubleArray,
        holdFraction: Float,
    ): Timeline {
        val timingKeys = spec.segments.map { it.timing }
        val timings = ArrayList<TimeInterpolator>(timingKeys.size)
        try {
            timingKeys.forEach { timings.add(timingCache.acquire(it)) }
        } catch (e: IllegalArgumentException) {
            timingKeys.take(timings.size).forEach(timingCache::release)
            throw e
        }
        return Timeline(
            values = listOf(startValue) + spec.segments.map { it.endValue },
            endOffsets = spec.segments.map { it.endOffset }.toDoubleArray(),
            timings = timings,
            timingKeys = timingKeys,
            holdFraction = holdFraction,
            writer = writer,
        )
    }

    private fun onAnimationEnd(playback: TrackPlayback) {
        // The animator can post a natural end after the record left the map.
        if (playbacks[playback.key] !== playback) return
        if (!playback.holdsEndValue) {
            playbacks.remove(playback.key)
            playback.timeline.release(timingCache)
        }
        val key = playback.key
        nativeCallGuard { callbacks.onTrackEnded(key.surfaceId, key.tag, key.owner, key.generation, key.target, true) }
    }

    private fun remove(key: TrackKey): TrackPlayback? {
        val playback = playbacks.remove(key) ?: return null
        playback.animator.cancel()
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
