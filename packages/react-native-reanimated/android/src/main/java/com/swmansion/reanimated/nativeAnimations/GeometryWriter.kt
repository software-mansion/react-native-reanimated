package com.swmansion.reanimated.nativeAnimations

import android.graphics.Matrix
import android.os.Build
import android.view.View
import androidx.annotation.RequiresApi

/**
 * The one Reanimated writer of the animation matrix of a view, shared by its position and transform tracks. Each
 * position track adds the offset of its value from the mounted centre that the view had when the track started; a
 * transform track adds its value about the view centre. The view draws `animationMatrix ∘ matrix`, so with a
 * transform track the writer cancels the model matrix of the view.
 *
 * React Native also writes the field (the matrix of a skew transform). The writer keeps that value as the model of
 * the field: a position track adds its offset over the model, and the view shows the model when no track is left.
 */
@RequiresApi(Build.VERSION_CODES.Q)
internal class GeometryWriter(
    private val density: Float,
) {
    private class PositionOffset(
        val basePx: Float,
        val valuePoints: Double,
    )

    private class TransformValue(
        val operations: IntArray,
        val values: DoubleArray,
    )

    private val offsets = HashMap<Int, PositionOffset>()
    private var transform: TransformValue? = null
    private var model: Matrix? = null
    private var lastWritten: Matrix? = null

    fun setPosition(
        target: Int,
        basePx: Float,
        valuePoints: Double,
    ) {
        offsets[target] = PositionOffset(basePx, valuePoints)
    }

    fun setTransform(
        operations: IntArray,
        values: DoubleArray,
    ) {
        transform = TransformValue(operations, values.copyOf())
    }

    fun release(target: Int) {
        if (target == TrackEncoding.TARGET_TRANSFORM) {
            transform = null
        } else {
            offsets.remove(target)
        }
    }

    fun write(view: View) {
        val shown = view.animationMatrix
        if (shown != lastWritten) {
            model = shown
        }
        val written = animationMatrixOf(view)
        view.animationMatrix = written
        lastWritten = written
    }

    fun shows(view: View): Boolean = view.animationMatrix == lastWritten && lastWritten == animationMatrixOf(view)

    /** The offset of the position target in points. */
    fun offsetPoints(target: Int): Double = offsets[target]?.let { it.valuePoints - it.basePx / density } ?: 0.0

    /** The cells of the transform value in points, or null with no transform track. */
    fun transformCells(): DoubleArray? = transform?.let { cellsOf(matrixOf(it.operations, it.values, 1f), 1f) }

    /**
     * With a transform track `T(Δ) ∘ C(t) ∘ V⁻¹`, with `C(t)` the transform value about the centre and `V` the model
     * matrix of the view; else `T(Δ) ∘ model`, and the model with no track.
     */
    private fun animationMatrixOf(view: View): Matrix? {
        val current = transform
        if (offsets.isEmpty() && current == null) return model
        val matrix = current?.let { transformOverViewMatrixOf(view, it) } ?: Matrix(model)
        matrix.postTranslate(offsetPx(TrackEncoding.TARGET_POSITION_X), offsetPx(TrackEncoding.TARGET_POSITION_Y))
        return matrix
    }

    /** `C(t) ∘ V⁻¹`. */
    private fun transformOverViewMatrixOf(
        view: View,
        value: TransformValue,
    ): Matrix =
        Matrix().apply {
            Matrix(view.matrix).invert(this)
            postConcat(
                aboutPoint(matrixOf(value.operations, value.values, density), view.width / 2f, view.height / 2f),
            )
        }

    private fun offsetPx(target: Int): Float = offsets[target]?.let { (it.valuePoints * density - it.basePx).toFloat() } ?: 0f
}

/** The mounted centre of the view in pixels, the base of the offset of a position track. */
internal fun mountedCentrePx(
    view: View,
    target: Int,
): Float =
    if (target == TrackEncoding.TARGET_POSITION_X) {
        view.left + view.width / 2f
    } else {
        view.top + view.height / 2f
    }

/**
 * The model value of a geometry target that the mounted view holds, in points: the centre for a position, the
 * size for a size. Null for another target.
 */
internal fun mountedGeometryModelOf(
    view: View,
    target: Int,
    density: Float,
): DoubleArray? {
    val points = { px: Float -> (px / density).toDouble() }
    return when (target) {
        TrackEncoding.TARGET_POSITION ->
            doubleArrayOf(
                points(mountedCentrePx(view, TrackEncoding.TARGET_POSITION_X)),
                points(mountedCentrePx(view, TrackEncoding.TARGET_POSITION_Y)),
            )
        TrackEncoding.TARGET_POSITION_X, TrackEncoding.TARGET_POSITION_Y ->
            doubleArrayOf(points(mountedCentrePx(view, target)))
        TrackEncoding.TARGET_SIZE -> doubleArrayOf(points(view.width.toFloat()), points(view.height.toFloat()))
        TrackEncoding.TARGET_WIDTH -> doubleArrayOf(points(view.width.toFloat()))
        TrackEncoding.TARGET_HEIGHT -> doubleArrayOf(points(view.height.toFloat()))
        TrackEncoding.TARGET_TRANSFORM -> modelTransformCells(view, density)
        else -> null
    }
}

/**
 * The model matrix without the pivot of the view: `M = T(−c) ∘ V ∘ T(c)` in points, with `c` the centre. The
 * view rotates and scales about its centre, so `V = T(c) ∘ M ∘ T(−c)`.
 */
private fun modelTransformCells(
    view: View,
    density: Float,
): DoubleArray {
    val cells = FloatArray(9)
    view.matrix.getValues(cells)
    cells[Matrix.MTRANS_X] /= density
    cells[Matrix.MTRANS_Y] /= density
    val modelInPoints = Matrix().apply { setValues(cells) }
    val model = aboutPoint(modelInPoints, -view.width / 2f / density, -view.height / 2f / density)
    return cellsOf(model, 1f)
}

/** `T(q) ∘ matrix ∘ T(−q)`: [matrix] about the point `q`. */
private fun aboutPoint(
    matrix: Matrix,
    x: Float,
    y: Float,
): Matrix =
    Matrix(matrix).apply {
        preTranslate(-x, -y)
        postTranslate(x, y)
    }

/** The product of the operations in list order, as React Native composes a style transform. */
private fun matrixOf(
    operations: IntArray,
    values: DoubleArray,
    pixelsPerPoint: Float,
): Matrix =
    Matrix().apply {
        operations.forEachIndexed { index, operation ->
            val value = values[index].toFloat()
            when (operation) {
                TrackEncoding.OPERATION_TRANSLATE_X -> preTranslate(value * pixelsPerPoint, 0f)
                TrackEncoding.OPERATION_TRANSLATE_Y -> preTranslate(0f, value * pixelsPerPoint)
                TrackEncoding.OPERATION_SCALE -> preScale(value, value)
                TrackEncoding.OPERATION_SCALE_X -> preScale(value, 1f)
                TrackEncoding.OPERATION_SCALE_Y -> preScale(1f, value)
                TrackEncoding.OPERATION_ROTATE_Z -> preRotate(Math.toDegrees(values[index]).toFloat())
            }
        }
    }

/**
 * The 16 cells of `facebook::react::Transform` (row vectors, translation in cells 12 and 13) of a 2D matrix. The
 * cells that a 2D matrix has no place for are those of the identity.
 */
private fun cellsOf(
    matrix: Matrix,
    pixelsPerPoint: Float,
): DoubleArray {
    val cells = FloatArray(9)
    matrix.getValues(cells)
    return DoubleArray(16).apply {
        this[0] = cells[Matrix.MSCALE_X].toDouble()
        this[1] = cells[Matrix.MSKEW_Y].toDouble()
        this[4] = cells[Matrix.MSKEW_X].toDouble()
        this[5] = cells[Matrix.MSCALE_Y].toDouble()
        this[10] = 1.0
        this[12] = (cells[Matrix.MTRANS_X] / pixelsPerPoint).toDouble()
        this[13] = (cells[Matrix.MTRANS_Y] / pixelsPerPoint).toDouble()
        this[15] = 1.0
    }
}

internal fun operationName(operation: Int): String =
    when (operation) {
        TrackEncoding.OPERATION_TRANSLATE_X -> "translateX"
        TrackEncoding.OPERATION_TRANSLATE_Y -> "translateY"
        TrackEncoding.OPERATION_SCALE -> "scale"
        TrackEncoding.OPERATION_SCALE_X -> "scaleX"
        TrackEncoding.OPERATION_SCALE_Y -> "scaleY"
        TrackEncoding.OPERATION_ROTATE_Z -> "rotateZ"
        else -> error("[Reanimated] The Android executor plays no transform operation $operation")
    }
