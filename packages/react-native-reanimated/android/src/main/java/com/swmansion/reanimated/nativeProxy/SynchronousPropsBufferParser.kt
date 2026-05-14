package com.swmansion.reanimated.nativeProxy

import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import java.util.Arrays

internal object SynchronousPropsBufferParser {
    // NOTE: Keep in sync with SynchronousPropsBufferSerializer.cpp
    private const val CMD_START_OF_VIEW = 1
    private const val CMD_START_OF_TRANSFORM = 2
    private const val CMD_END_OF_TRANSFORM = 3
    private const val CMD_END_OF_VIEW = 4

    private const val CMD_OPACITY = 10
    private const val CMD_ELEVATION = 11
    private const val CMD_Z_INDEX = 12
    private const val CMD_SHADOW_COLOR = 19
    private const val CMD_BACKGROUND_COLOR = 15
    private const val CMD_TINT_COLOR = 17
    private const val CMD_PLACEHOLDER_TEXT_COLOR = 18

    private const val CMD_BORDER_RADIUS = 20
    private const val CMD_BORDER_TOP_LEFT_RADIUS = 21
    private const val CMD_BORDER_TOP_RIGHT_RADIUS = 22
    private const val CMD_BORDER_TOP_START_RADIUS = 23
    private const val CMD_BORDER_TOP_END_RADIUS = 24
    private const val CMD_BORDER_BOTTOM_LEFT_RADIUS = 25
    private const val CMD_BORDER_BOTTOM_RIGHT_RADIUS = 26
    private const val CMD_BORDER_BOTTOM_START_RADIUS = 27
    private const val CMD_BORDER_BOTTOM_END_RADIUS = 28
    private const val CMD_BORDER_START_START_RADIUS = 29
    private const val CMD_BORDER_START_END_RADIUS = 30
    private const val CMD_BORDER_END_START_RADIUS = 31
    private const val CMD_BORDER_END_END_RADIUS = 32

    private const val CMD_BORDER_COLOR = 40
    private const val CMD_BORDER_TOP_COLOR = 41
    private const val CMD_BORDER_BOTTOM_COLOR = 42
    private const val CMD_BORDER_LEFT_COLOR = 43
    private const val CMD_BORDER_RIGHT_COLOR = 44
    private const val CMD_BORDER_START_COLOR = 45
    private const val CMD_BORDER_END_COLOR = 46
    private const val CMD_BORDER_BLOCK_COLOR = 47
    private const val CMD_BORDER_BLOCK_START_COLOR = 48
    private const val CMD_BORDER_BLOCK_END_COLOR = 49

    private const val CMD_OUTLINE_COLOR = 50
    private const val CMD_OUTLINE_OFFSET = 51
    private const val CMD_OUTLINE_WIDTH = 52

    private const val CMD_TRANSFORM_TRANSLATE_X = 100
    private const val CMD_TRANSFORM_TRANSLATE_Y = 101
    private const val CMD_TRANSFORM_SCALE = 102
    private const val CMD_TRANSFORM_SCALE_X = 103
    private const val CMD_TRANSFORM_SCALE_Y = 104
    private const val CMD_TRANSFORM_ROTATE = 105
    private const val CMD_TRANSFORM_ROTATE_X = 106
    private const val CMD_TRANSFORM_ROTATE_Y = 107
    private const val CMD_TRANSFORM_ROTATE_Z = 108
    private const val CMD_TRANSFORM_SKEW_X = 109
    private const val CMD_TRANSFORM_SKEW_Y = 110
    private const val CMD_TRANSFORM_MATRIX = 111
    private const val CMD_TRANSFORM_PERSPECTIVE = 112

    private const val CMD_UNIT_DEG = 200
    private const val CMD_UNIT_RAD = 201
    private const val CMD_UNIT_PX = 202
    private const val CMD_UNIT_PERCENT = 203

    private fun commandToString(command: Int): String =
        when (command) {
            CMD_OPACITY -> "opacity"
            CMD_ELEVATION -> "elevation"
            CMD_Z_INDEX -> "zIndex"
            CMD_SHADOW_COLOR -> "shadowColor"
            CMD_BACKGROUND_COLOR -> "backgroundColor"
            CMD_TINT_COLOR -> "tintColor"
            CMD_PLACEHOLDER_TEXT_COLOR -> "placeholderTextColor"
            CMD_BORDER_RADIUS -> "borderRadius"
            CMD_BORDER_TOP_LEFT_RADIUS -> "borderTopLeftRadius"
            CMD_BORDER_TOP_RIGHT_RADIUS -> "borderTopRightRadius"
            CMD_BORDER_TOP_START_RADIUS -> "borderTopStartRadius"
            CMD_BORDER_TOP_END_RADIUS -> "borderTopEndRadius"
            CMD_BORDER_BOTTOM_LEFT_RADIUS -> "borderBottomLeftRadius"
            CMD_BORDER_BOTTOM_RIGHT_RADIUS -> "borderBottomRightRadius"
            CMD_BORDER_BOTTOM_START_RADIUS -> "borderBottomStartRadius"
            CMD_BORDER_BOTTOM_END_RADIUS -> "borderBottomEndRadius"
            CMD_BORDER_START_START_RADIUS -> "borderStartStartRadius"
            CMD_BORDER_START_END_RADIUS -> "borderStartEndRadius"
            CMD_BORDER_END_START_RADIUS -> "borderEndStartRadius"
            CMD_BORDER_END_END_RADIUS -> "borderEndEndRadius"
            CMD_BORDER_COLOR -> "borderColor"
            CMD_BORDER_TOP_COLOR -> "borderTopColor"
            CMD_BORDER_BOTTOM_COLOR -> "borderBottomColor"
            CMD_BORDER_LEFT_COLOR -> "borderLeftColor"
            CMD_BORDER_RIGHT_COLOR -> "borderRightColor"
            CMD_BORDER_START_COLOR -> "borderStartColor"
            CMD_BORDER_END_COLOR -> "borderEndColor"
            CMD_BORDER_BLOCK_COLOR -> "borderBlockColor"
            CMD_BORDER_BLOCK_START_COLOR -> "borderBlockStartColor"
            CMD_BORDER_BLOCK_END_COLOR -> "borderBlockEndColor"
            CMD_OUTLINE_COLOR -> "outlineColor"
            CMD_OUTLINE_OFFSET -> "outlineOffset"
            CMD_OUTLINE_WIDTH -> "outlineWidth"
            else -> throw RuntimeException("Unknown command: $command")
        }

    private fun transformCommandToString(transformCommand: Int): String =
        when (transformCommand) {
            CMD_TRANSFORM_TRANSLATE_X -> "translateX"
            CMD_TRANSFORM_TRANSLATE_Y -> "translateY"
            CMD_TRANSFORM_SCALE -> "scale"
            CMD_TRANSFORM_SCALE_X -> "scaleX"
            CMD_TRANSFORM_SCALE_Y -> "scaleY"
            CMD_TRANSFORM_ROTATE -> "rotate"
            CMD_TRANSFORM_ROTATE_X -> "rotateX"
            CMD_TRANSFORM_ROTATE_Y -> "rotateY"
            CMD_TRANSFORM_ROTATE_Z -> "rotateZ"
            CMD_TRANSFORM_SKEW_X -> "skewX"
            CMD_TRANSFORM_SKEW_Y -> "skewY"
            CMD_TRANSFORM_MATRIX -> "matrix"
            CMD_TRANSFORM_PERSPECTIVE -> "perspective"
            else -> throw RuntimeException("Unknown transform command: $transformCommand")
        }

    fun parse(
        intBuffer: IntArray,
        doubleBuffer: DoubleArray,
        applyProps: (viewTag: Int, props: JavaOnlyMap) -> Unit,
    ) {
        val intIterator = Arrays.stream(intBuffer).iterator()
        val doubleIterator = Arrays.stream(doubleBuffer).iterator()
        var viewTag = -1
        var props = JavaOnlyMap()
        while (intIterator.hasNext()) {
            val command = intIterator.nextInt()
            when (command) {
                CMD_START_OF_VIEW -> {
                    viewTag = intIterator.nextInt()
                    props = JavaOnlyMap()
                }

                CMD_OPACITY,
                CMD_ELEVATION,
                CMD_Z_INDEX,
                CMD_OUTLINE_OFFSET,
                CMD_OUTLINE_WIDTH,
                -> {
                    val name = commandToString(command)
                    props.putDouble(name, doubleIterator.nextDouble())
                }

                CMD_SHADOW_COLOR,
                CMD_BACKGROUND_COLOR,
                CMD_TINT_COLOR,
                CMD_PLACEHOLDER_TEXT_COLOR,
                CMD_BORDER_COLOR,
                CMD_BORDER_TOP_COLOR,
                CMD_BORDER_BOTTOM_COLOR,
                CMD_BORDER_LEFT_COLOR,
                CMD_BORDER_RIGHT_COLOR,
                CMD_BORDER_START_COLOR,
                CMD_BORDER_END_COLOR,
                CMD_BORDER_BLOCK_COLOR,
                CMD_BORDER_BLOCK_START_COLOR,
                CMD_BORDER_BLOCK_END_COLOR,
                CMD_OUTLINE_COLOR,
                -> {
                    val name = commandToString(command)
                    props.putInt(name, intIterator.nextInt())
                }

                CMD_BORDER_RADIUS,
                CMD_BORDER_TOP_LEFT_RADIUS,
                CMD_BORDER_TOP_RIGHT_RADIUS,
                CMD_BORDER_TOP_START_RADIUS,
                CMD_BORDER_TOP_END_RADIUS,
                CMD_BORDER_BOTTOM_LEFT_RADIUS,
                CMD_BORDER_BOTTOM_RIGHT_RADIUS,
                CMD_BORDER_BOTTOM_START_RADIUS,
                CMD_BORDER_BOTTOM_END_RADIUS,
                CMD_BORDER_START_START_RADIUS,
                CMD_BORDER_START_END_RADIUS,
                CMD_BORDER_END_START_RADIUS,
                CMD_BORDER_END_END_RADIUS,
                -> {
                    val name = commandToString(command)
                    val value = doubleIterator.nextDouble()
                    when (intIterator.nextInt()) {
                        CMD_UNIT_PX -> props.putDouble(name, value)
                        CMD_UNIT_PERCENT -> props.putString(name, "$value%")
                        else -> throw RuntimeException("Unknown unit command")
                    }
                }

                CMD_START_OF_TRANSFORM -> {
                    val transform = JavaOnlyArray()
                    while (true) {
                        val transformCommand = intIterator.nextInt()
                        if (transformCommand == CMD_END_OF_TRANSFORM) {
                            props.putArray("transform", transform)
                            break
                        }
                        val name = transformCommandToString(transformCommand)
                        when (transformCommand) {
                            CMD_TRANSFORM_TRANSLATE_X,
                            CMD_TRANSFORM_TRANSLATE_Y,
                            -> {
                                val value = doubleIterator.nextDouble()
                                when (intIterator.nextInt()) {
                                    CMD_UNIT_PX -> transform.pushMap(JavaOnlyMap.of(name, value))
                                    CMD_UNIT_PERCENT -> transform.pushMap(JavaOnlyMap.of(name, "$value%"))
                                    else -> throw RuntimeException("Unknown unit command")
                                }
                            }

                            CMD_TRANSFORM_SCALE,
                            CMD_TRANSFORM_SCALE_X,
                            CMD_TRANSFORM_SCALE_Y,
                            CMD_TRANSFORM_PERSPECTIVE,
                            -> {
                                val value = doubleIterator.nextDouble()
                                transform.pushMap(JavaOnlyMap.of(name, value))
                            }

                            CMD_TRANSFORM_ROTATE,
                            CMD_TRANSFORM_ROTATE_X,
                            CMD_TRANSFORM_ROTATE_Y,
                            CMD_TRANSFORM_ROTATE_Z,
                            CMD_TRANSFORM_SKEW_X,
                            CMD_TRANSFORM_SKEW_Y,
                            -> {
                                val angle = doubleIterator.nextDouble()
                                val unit =
                                    when (intIterator.nextInt()) {
                                        CMD_UNIT_DEG -> "deg"
                                        CMD_UNIT_RAD -> "rad"
                                        else -> throw RuntimeException("Unknown unit command")
                                    }
                                transform.pushMap(JavaOnlyMap.of(name, angle.toString() + unit))
                            }

                            CMD_TRANSFORM_MATRIX -> {
                                val length = intIterator.nextInt()
                                val matrix = JavaOnlyArray()
                                for (i in 0 until length) {
                                    matrix.pushDouble(doubleIterator.nextDouble())
                                }
                                transform.pushMap(JavaOnlyMap.of(name, matrix))
                            }

                            else -> throw RuntimeException("Unknown transform type: $transformCommand")
                        }
                    }
                }

                CMD_END_OF_VIEW -> applyProps(viewTag, props)
                else -> throw RuntimeException("Unexpected command: $command")
            }
        }
    }
}
