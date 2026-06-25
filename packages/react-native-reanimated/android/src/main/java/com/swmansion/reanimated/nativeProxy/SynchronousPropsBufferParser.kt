package com.swmansion.reanimated.nativeProxy

import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.common.mapbuffer.MapBuffer
import com.facebook.react.common.mapbuffer.ReadableMapBuffer

internal object SynchronousPropsBufferParser {
    // MapBuffer keys. Keep in sync with SynchronousPropsBufferSerializer.cpp.
    //
    // Each view is a single flat (depth-1) map. Transform op `i` (in order) is
    // stored as the key pair (KEY_TRANSFORM_OP_BASE + 2*i) = type code,
    // (KEY_TRANSFORM_OP_BASE + 2*i + 1) = value. Because entries arrive sorted by
    // key, a type key is always immediately followed by its value key and ops
    // stay in order, so one linear pass reconstructs everything.
    //
    // Layout:
    //   root map: { KEY_VIEWS: [ viewMap, ... ] }
    //   viewMap:  { KEY_VIEW_TAG: int, <propKey>: value, ...,
    //              OP(0): typeCode, VAL(0): value, OP(1): typeCode, VAL(1): value, ... }
    //   matrix value: nested Map keyed by index { 0: double, 1: double, ... }
    //
    // The MapBuffer DataType of each value tells us how to reconstruct it:
    //   DOUBLE -> plain number / px length
    //   INT    -> color (ARGB)
    //   STRING -> percentage ("50%") or angle ("90deg" / "1rad")
    //   MAP    -> transform matrix (only for the matrix transform)
    private const val KEY_VIEWS = 0
    private const val KEY_VIEW_TAG = 1
    private const val KEY_TRANSFORM_OP_BASE = 1000

    private const val KEY_OPACITY = 10
    private const val KEY_ELEVATION = 11
    private const val KEY_Z_INDEX = 12
    private const val KEY_SHADOW_COLOR = 19
    private const val KEY_BACKGROUND_COLOR = 15
    private const val KEY_TINT_COLOR = 17
    private const val KEY_PLACEHOLDER_TEXT_COLOR = 18

    private const val KEY_BORDER_RADIUS = 20
    private const val KEY_BORDER_TOP_LEFT_RADIUS = 21
    private const val KEY_BORDER_TOP_RIGHT_RADIUS = 22
    private const val KEY_BORDER_TOP_START_RADIUS = 23
    private const val KEY_BORDER_TOP_END_RADIUS = 24
    private const val KEY_BORDER_BOTTOM_LEFT_RADIUS = 25
    private const val KEY_BORDER_BOTTOM_RIGHT_RADIUS = 26
    private const val KEY_BORDER_BOTTOM_START_RADIUS = 27
    private const val KEY_BORDER_BOTTOM_END_RADIUS = 28
    private const val KEY_BORDER_START_START_RADIUS = 29
    private const val KEY_BORDER_START_END_RADIUS = 30
    private const val KEY_BORDER_END_START_RADIUS = 31
    private const val KEY_BORDER_END_END_RADIUS = 32

    private const val KEY_BORDER_COLOR = 40
    private const val KEY_BORDER_TOP_COLOR = 41
    private const val KEY_BORDER_BOTTOM_COLOR = 42
    private const val KEY_BORDER_LEFT_COLOR = 43
    private const val KEY_BORDER_RIGHT_COLOR = 44
    private const val KEY_BORDER_START_COLOR = 45
    private const val KEY_BORDER_END_COLOR = 46
    private const val KEY_BORDER_BLOCK_COLOR = 47
    private const val KEY_BORDER_BLOCK_START_COLOR = 48
    private const val KEY_BORDER_BLOCK_END_COLOR = 49

    private const val KEY_OUTLINE_COLOR = 50
    private const val KEY_OUTLINE_OFFSET = 51
    private const val KEY_OUTLINE_WIDTH = 52

    private const val KEY_TRANSFORM_TRANSLATE_X = 100
    private const val KEY_TRANSFORM_TRANSLATE_Y = 101
    private const val KEY_TRANSFORM_SCALE = 102
    private const val KEY_TRANSFORM_SCALE_X = 103
    private const val KEY_TRANSFORM_SCALE_Y = 104
    private const val KEY_TRANSFORM_ROTATE = 105
    private const val KEY_TRANSFORM_ROTATE_X = 106
    private const val KEY_TRANSFORM_ROTATE_Y = 107
    private const val KEY_TRANSFORM_ROTATE_Z = 108
    private const val KEY_TRANSFORM_SKEW_X = 109
    private const val KEY_TRANSFORM_SKEW_Y = 110
    private const val KEY_TRANSFORM_MATRIX = 111
    private const val KEY_TRANSFORM_PERSPECTIVE = 112

    private fun keyToString(key: Int): String =
        when (key) {
            KEY_OPACITY -> "opacity"
            KEY_ELEVATION -> "elevation"
            KEY_Z_INDEX -> "zIndex"
            KEY_SHADOW_COLOR -> "shadowColor"
            KEY_BACKGROUND_COLOR -> "backgroundColor"
            KEY_TINT_COLOR -> "tintColor"
            KEY_PLACEHOLDER_TEXT_COLOR -> "placeholderTextColor"
            KEY_BORDER_RADIUS -> "borderRadius"
            KEY_BORDER_TOP_LEFT_RADIUS -> "borderTopLeftRadius"
            KEY_BORDER_TOP_RIGHT_RADIUS -> "borderTopRightRadius"
            KEY_BORDER_TOP_START_RADIUS -> "borderTopStartRadius"
            KEY_BORDER_TOP_END_RADIUS -> "borderTopEndRadius"
            KEY_BORDER_BOTTOM_LEFT_RADIUS -> "borderBottomLeftRadius"
            KEY_BORDER_BOTTOM_RIGHT_RADIUS -> "borderBottomRightRadius"
            KEY_BORDER_BOTTOM_START_RADIUS -> "borderBottomStartRadius"
            KEY_BORDER_BOTTOM_END_RADIUS -> "borderBottomEndRadius"
            KEY_BORDER_START_START_RADIUS -> "borderStartStartRadius"
            KEY_BORDER_START_END_RADIUS -> "borderStartEndRadius"
            KEY_BORDER_END_START_RADIUS -> "borderEndStartRadius"
            KEY_BORDER_END_END_RADIUS -> "borderEndEndRadius"
            KEY_BORDER_COLOR -> "borderColor"
            KEY_BORDER_TOP_COLOR -> "borderTopColor"
            KEY_BORDER_BOTTOM_COLOR -> "borderBottomColor"
            KEY_BORDER_LEFT_COLOR -> "borderLeftColor"
            KEY_BORDER_RIGHT_COLOR -> "borderRightColor"
            KEY_BORDER_START_COLOR -> "borderStartColor"
            KEY_BORDER_END_COLOR -> "borderEndColor"
            KEY_BORDER_BLOCK_COLOR -> "borderBlockColor"
            KEY_BORDER_BLOCK_START_COLOR -> "borderBlockStartColor"
            KEY_BORDER_BLOCK_END_COLOR -> "borderBlockEndColor"
            KEY_OUTLINE_COLOR -> "outlineColor"
            KEY_OUTLINE_OFFSET -> "outlineOffset"
            KEY_OUTLINE_WIDTH -> "outlineWidth"
            else -> throw RuntimeException("Unknown key: $key")
        }

    private fun transformKeyToString(transformKey: Int): String =
        when (transformKey) {
            KEY_TRANSFORM_TRANSLATE_X -> "translateX"
            KEY_TRANSFORM_TRANSLATE_Y -> "translateY"
            KEY_TRANSFORM_SCALE -> "scale"
            KEY_TRANSFORM_SCALE_X -> "scaleX"
            KEY_TRANSFORM_SCALE_Y -> "scaleY"
            KEY_TRANSFORM_ROTATE -> "rotate"
            KEY_TRANSFORM_ROTATE_X -> "rotateX"
            KEY_TRANSFORM_ROTATE_Y -> "rotateY"
            KEY_TRANSFORM_ROTATE_Z -> "rotateZ"
            KEY_TRANSFORM_SKEW_X -> "skewX"
            KEY_TRANSFORM_SKEW_Y -> "skewY"
            KEY_TRANSFORM_MATRIX -> "matrix"
            KEY_TRANSFORM_PERSPECTIVE -> "perspective"
            else -> throw RuntimeException("Unknown transform key: $transformKey")
        }

    fun parse(
        mapBuffer: ReadableMapBuffer,
        applyProps: (viewTag: Int, props: JavaOnlyMap) -> Unit,
    ) {
        for (viewMap in mapBuffer.getMapBufferList(KEY_VIEWS)) {
            var viewTag = -1
            val props = JavaOnlyMap()
            var transform: JavaOnlyArray? = null
            var pendingType = -1

            for (entry in viewMap) {
                val key = entry.key
                when {
                    key == KEY_VIEW_TAG -> viewTag = entry.intValue

                    key >= KEY_TRANSFORM_OP_BASE -> {
                        if ((key - KEY_TRANSFORM_OP_BASE) % 2 == 0) {
                            // type-code key: remember which op this is
                            pendingType = entry.intValue
                        } else {
                            // value key: pair it with the type seen just before
                            val arr = transform ?: JavaOnlyArray().also { transform = it }
                            val name = transformKeyToString(pendingType)
                            when (entry.type) {
                                MapBuffer.DataType.DOUBLE -> arr.pushMap(JavaOnlyMap.of(name, entry.doubleValue))
                                MapBuffer.DataType.STRING -> arr.pushMap(JavaOnlyMap.of(name, entry.stringValue))
                                MapBuffer.DataType.MAP -> {
                                    val matrix = JavaOnlyArray()
                                    for (element in entry.mapBufferValue) {
                                        matrix.pushDouble(element.doubleValue)
                                    }
                                    arr.pushMap(JavaOnlyMap.of(name, matrix))
                                }
                                else -> throw RuntimeException("Unexpected value type for transform $name: ${entry.type}")
                            }
                        }
                    }

                    else -> {
                        val name = keyToString(key)
                        when (entry.type) {
                            MapBuffer.DataType.DOUBLE -> props.putDouble(name, entry.doubleValue)
                            MapBuffer.DataType.INT -> props.putInt(name, entry.intValue)
                            MapBuffer.DataType.STRING -> props.putString(name, entry.stringValue)
                            else -> throw RuntimeException("Unexpected value type for prop $name: ${entry.type}")
                        }
                    }
                }
            }

            transform?.let { props.putArray("transform", it) }
            applyProps(viewTag, props)
        }
    }
}
