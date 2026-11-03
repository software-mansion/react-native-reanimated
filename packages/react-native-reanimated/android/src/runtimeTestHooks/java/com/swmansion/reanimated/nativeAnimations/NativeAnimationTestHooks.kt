package com.swmansion.reanimated.nativeAnimations

import android.os.Build
import android.view.View
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.uimanager.PixelUtil

/** The runtime-test reads of the executor. The C++ platform calls them. */
@DoNotStrip
internal object NativeAnimationTestHooks {
    @JvmStatic
    @DoNotStrip
    fun sample(
        executor: NativeAnimationExecutor,
        tag: Int,
        target: Int,
    ): NativeAnimationSample? {
        UiThreadUtil.assertOnUiThread()
        val view = executor.viewOf(tag) ?: return null
        val onView = executor.playbackRecords.filter { it.view.get() === view }
        val member = onView.firstOrNull { it.key.target == target }
        return NativeAnimationSample(
            model = executor.modelOf(view, target),
            presentation = presentationOf(executor, view, target),
            playbacks = onView.flatMap { it.key.toLongs().asList() }.toLongArray(),
            members = member?.let(::membersOf) ?: emptyArray(),
        )
    }

    @JvmStatic
    @DoNotStrip
    fun containerSizes(executor: NativeAnimationExecutor): NativeAnimationContainerSizes {
        UiThreadUtil.assertOnUiThread()
        return NativeAnimationContainerSizes(
            playbacks = executor.playbackRecords.size,
            geometryWriters = executor.viewGeometryWriters.size,
        )
    }

    private fun presentationOf(
        executor: NativeAnimationExecutor,
        view: View,
        target: Int,
    ): DoubleArray {
        val model = mountedGeometryModelOf(view, target, PixelUtil.getDisplayMetricDensity())
        val writer = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) executor.viewGeometryWriters[view] else null
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

    private fun TrackKey.toLongs(): LongArray = longArrayOf(surfaceId.toLong(), tag.toLong(), owner.toLong(), generation, target.toLong())
}
