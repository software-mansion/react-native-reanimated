package com.swmansion.reanimated.nativeAnimations

import android.os.Build
import android.view.View
import androidx.annotation.RequiresApi

/** How a track reaches its view: a writer of a view property, the shared geometry writer, or a timed hold. */
internal sealed interface TrackBinding {
    /** The platform name of the member of the timeline of the slot [timeline]. */
    fun memberProperty(timeline: Int): String

    fun apply(
        view: View,
        value: DoubleArray,
    )

    /** Whether the view shows [value]; the pre-draw repair writes it again when it does not. */
    fun shows(
        view: View,
        value: DoubleArray,
    ): Boolean

    /** The track ends at the model of the view: [value] becomes the model value, and the view shows it. */
    fun showModel(
        view: View,
        value: DoubleArray,
    )

    /** Takes out what the binding adds to the view. */
    fun release(view: View)

    /** The sample form of [value]. */
    fun sampleComponentsOf(value: DoubleArray): DoubleArray = value.copyOf()
}

internal class PropertyBinding(
    val writer: TrackWriter,
) : TrackBinding {
    override fun memberProperty(timeline: Int) = writer.property

    override fun apply(
        view: View,
        value: DoubleArray,
    ) = writer.apply(view, value)

    override fun shows(
        view: View,
        value: DoubleArray,
    ) = writer.shows(view, value)

    override fun showModel(
        view: View,
        value: DoubleArray,
    ) = writer.apply(view, value)

    override fun release(view: View) = Unit

    override fun sampleComponentsOf(value: DoubleArray) = writer.sampleComponentsOf(value)
}

/**
 * The opacity of a track. React Native and the writer write the same view value, so the record keeps the model
 * value: the end value of an `ExecutorCommitsEndpoint` track, else the model at the start, then the values that
 * the mount and the synchronous props give. Outside `prepare`, a view has one opacity record at most.
 */
internal class OpacityBinding(
    var model: Double,
) : TrackBinding {
    override fun memberProperty(timeline: Int) = AlphaWriter.property

    override fun apply(
        view: View,
        value: DoubleArray,
    ) = AlphaWriter.apply(view, value)

    override fun shows(
        view: View,
        value: DoubleArray,
    ) = AlphaWriter.shows(view, value)

    override fun showModel(
        view: View,
        value: DoubleArray,
    ) {
        value[0] = model
        AlphaWriter.apply(view, value)
    }

    override fun release(view: View) = Unit

    fun writeModel(view: View) = AlphaWriter.apply(view, doubleArrayOf(model))
}

/** A track that writes no property: it gives only its duration, delay, and completion. */
internal object HoldBinding : TrackBinding {
    override fun memberProperty(timeline: Int) = "hold"

    override fun apply(
        view: View,
        value: DoubleArray,
    ) = Unit

    override fun shows(
        view: View,
        value: DoubleArray,
    ) = true

    override fun showModel(
        view: View,
        value: DoubleArray,
    ) = Unit

    override fun release(view: View) = Unit
}

@RequiresApi(Build.VERSION_CODES.Q)
internal class GeometryBinding(
    private val writer: GeometryWriter,
    private val target: Int,
    /** The transform operations of each slot; empty for a position track. */
    private val operations: IntArray,
    private val basePx: Float,
) : TrackBinding {
    override fun memberProperty(timeline: Int) =
        when (target) {
            TrackEncoding.TARGET_POSITION_X -> "position.x"
            TrackEncoding.TARGET_POSITION_Y -> "position.y"
            else -> "transform.${operationName(operations[timeline])}"
        }

    override fun apply(
        view: View,
        value: DoubleArray,
    ) {
        if (target == TrackEncoding.TARGET_TRANSFORM) {
            writer.setTransform(operations, value)
        } else {
            writer.setPosition(target, basePx, value[0])
        }
        writer.write(view)
    }

    override fun shows(
        view: View,
        value: DoubleArray,
    ) = writer.shows(view)

    override fun showModel(
        view: View,
        value: DoubleArray,
    ) = release(view)

    override fun release(view: View) {
        writer.release(target)
        writer.write(view)
    }
}
