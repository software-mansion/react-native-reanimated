#include <reanimated/NativeModules/SynchronousPropsBufferSerializer.h>

#ifdef ANDROID

#include <react/debug/react_native_assert.h>
#include <react/renderer/mapbuffer/MapBufferBuilder.h>

#include <cstdint>
#include <stdexcept>
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>

using namespace facebook::react;

namespace reanimated {

namespace {

// MapBuffer keys. Keep in sync with SynchronousPropsBufferParser.kt.
//
// Each view is a single, flat (depth-1) MapBuffer. Transform ops are stored as
// indexed key pairs rather than a nested list of sub-maps: op `i` (in order)
// occupies key (KEY_TRANSFORM_OP_BASE + 2*i) = transform type code and key
// (KEY_TRANSFORM_OP_BASE + 2*i + 1) = its value. This keeps serialization to one
// builder per view and lets the parser reconstruct everything in a single linear
// pass with no per-op sub-buffer allocations.
//
// Layout:
//   root map: { KEY_VIEWS: [ viewMap, ... ] }
//   viewMap:  { KEY_VIEW_TAG: int, <propKey>: value, ...,
//               OP(0): typeCode, VAL(0): value, OP(1): typeCode, VAL(1): value, ... }
//   matrix value: nested Map keyed by index { 0: double, 1: double, ... }
//
// The MapBuffer `DataType` of each value carries what the old command stream
// encoded with explicit unit markers:
//   - lengths in px / plain numbers -> Double
//   - colors                        -> Int (ARGB)
//   - percentages and angles        -> String (the original "50%" / "90deg" / "1rad")
//   - transform matrix              -> nested Map keyed by index
enum Key : std::uint8_t {
  // Reserved keys (must not collide with the prop/transform-code values below).
  KEY_VIEWS = 0,
  KEY_VIEW_TAG = 1,
  KEY_TRANSFORM = 2, // sentinel for the "transform" prop; never written as a key

  KEY_OPACITY = 10,
  KEY_ELEVATION = 11,
  KEY_Z_INDEX = 12,
  KEY_SHADOW_COLOR = 19,
  KEY_BACKGROUND_COLOR = 15,
  KEY_TINT_COLOR = 17,
  KEY_PLACEHOLDER_TEXT_COLOR = 18,

  KEY_BORDER_RADIUS = 20,
  KEY_BORDER_TOP_LEFT_RADIUS = 21,
  KEY_BORDER_TOP_RIGHT_RADIUS = 22,
  KEY_BORDER_TOP_START_RADIUS = 23,
  KEY_BORDER_TOP_END_RADIUS = 24,
  KEY_BORDER_BOTTOM_LEFT_RADIUS = 25,
  KEY_BORDER_BOTTOM_RIGHT_RADIUS = 26,
  KEY_BORDER_BOTTOM_START_RADIUS = 27,
  KEY_BORDER_BOTTOM_END_RADIUS = 28,
  KEY_BORDER_START_START_RADIUS = 29,
  KEY_BORDER_START_END_RADIUS = 30,
  KEY_BORDER_END_START_RADIUS = 31,
  KEY_BORDER_END_END_RADIUS = 32,

  KEY_BORDER_COLOR = 40,
  KEY_BORDER_TOP_COLOR = 41,
  KEY_BORDER_BOTTOM_COLOR = 42,
  KEY_BORDER_LEFT_COLOR = 43,
  KEY_BORDER_RIGHT_COLOR = 44,
  KEY_BORDER_START_COLOR = 45,
  KEY_BORDER_END_COLOR = 46,
  KEY_BORDER_BLOCK_COLOR = 47,
  KEY_BORDER_BLOCK_START_COLOR = 48,
  KEY_BORDER_BLOCK_END_COLOR = 49,

  KEY_OUTLINE_COLOR = 50,
  KEY_OUTLINE_OFFSET = 51,
  KEY_OUTLINE_WIDTH = 52,

  KEY_TRANSFORM_TRANSLATE_X = 100,
  KEY_TRANSFORM_TRANSLATE_Y = 101,
  KEY_TRANSFORM_SCALE = 102,
  KEY_TRANSFORM_SCALE_X = 103,
  KEY_TRANSFORM_SCALE_Y = 104,
  KEY_TRANSFORM_ROTATE = 105,
  KEY_TRANSFORM_ROTATE_X = 106,
  KEY_TRANSFORM_ROTATE_Y = 107,
  KEY_TRANSFORM_ROTATE_Z = 108,
  KEY_TRANSFORM_SKEW_X = 109,
  KEY_TRANSFORM_SKEW_Y = 110,
  KEY_TRANSFORM_MATRIX = 111,
  KEY_TRANSFORM_PERSPECTIVE = 112,
};

// Base for the indexed transform-op key pairs. Chosen well above the prop keys
// (10-52) so the two key spaces never collide within a view map.
constexpr MapBuffer::Key KEY_TRANSFORM_OP_BASE = 1000;

const std::unordered_map<std::string_view, Key> kPropNameToKey = {
    {"opacity", KEY_OPACITY},
    {"elevation", KEY_ELEVATION},
    {"zIndex", KEY_Z_INDEX},
    {"shadowColor", KEY_SHADOW_COLOR},
    {"backgroundColor", KEY_BACKGROUND_COLOR},
    {"tintColor", KEY_TINT_COLOR},
    {"placeholderTextColor", KEY_PLACEHOLDER_TEXT_COLOR},
    {"borderRadius", KEY_BORDER_RADIUS},
    {"borderTopLeftRadius", KEY_BORDER_TOP_LEFT_RADIUS},
    {"borderTopRightRadius", KEY_BORDER_TOP_RIGHT_RADIUS},
    {"borderTopStartRadius", KEY_BORDER_TOP_START_RADIUS},
    {"borderTopEndRadius", KEY_BORDER_TOP_END_RADIUS},
    {"borderBottomLeftRadius", KEY_BORDER_BOTTOM_LEFT_RADIUS},
    {"borderBottomRightRadius", KEY_BORDER_BOTTOM_RIGHT_RADIUS},
    {"borderBottomStartRadius", KEY_BORDER_BOTTOM_START_RADIUS},
    {"borderBottomEndRadius", KEY_BORDER_BOTTOM_END_RADIUS},
    {"borderStartStartRadius", KEY_BORDER_START_START_RADIUS},
    {"borderStartEndRadius", KEY_BORDER_START_END_RADIUS},
    {"borderEndStartRadius", KEY_BORDER_END_START_RADIUS},
    {"borderEndEndRadius", KEY_BORDER_END_END_RADIUS},
    {"borderColor", KEY_BORDER_COLOR},
    {"borderTopColor", KEY_BORDER_TOP_COLOR},
    {"borderBottomColor", KEY_BORDER_BOTTOM_COLOR},
    {"borderLeftColor", KEY_BORDER_LEFT_COLOR},
    {"borderRightColor", KEY_BORDER_RIGHT_COLOR},
    {"borderStartColor", KEY_BORDER_START_COLOR},
    {"borderEndColor", KEY_BORDER_END_COLOR},
    {"borderBlockColor", KEY_BORDER_BLOCK_COLOR},
    {"borderBlockStartColor", KEY_BORDER_BLOCK_START_COLOR},
    {"borderBlockEndColor", KEY_BORDER_BLOCK_END_COLOR},
    {"outlineColor", KEY_OUTLINE_COLOR},
    {"outlineOffset", KEY_OUTLINE_OFFSET},
    {"outlineWidth", KEY_OUTLINE_WIDTH},
    {"transform", KEY_TRANSFORM},
};

Key propNameToKey(const std::string &name) {
  const auto it = kPropNameToKey.find(name);
  if (it == kPropNameToKey.end()) {
    throw std::runtime_error("[Reanimated] Unsupported style: " + name);
  }
  return it->second;
}

const std::unordered_map<std::string_view, Key> kTransformNameToKey = {
    {"translateX", KEY_TRANSFORM_TRANSLATE_X},
    {"translateY", KEY_TRANSFORM_TRANSLATE_Y},
    {"scale", KEY_TRANSFORM_SCALE},
    {"scaleX", KEY_TRANSFORM_SCALE_X},
    {"scaleY", KEY_TRANSFORM_SCALE_Y},
    {"rotate", KEY_TRANSFORM_ROTATE},
    {"rotateX", KEY_TRANSFORM_ROTATE_X},
    {"rotateY", KEY_TRANSFORM_ROTATE_Y},
    {"rotateZ", KEY_TRANSFORM_ROTATE_Z},
    {"skewX", KEY_TRANSFORM_SKEW_X},
    {"skewY", KEY_TRANSFORM_SKEW_Y},
    {"matrix", KEY_TRANSFORM_MATRIX},
    {"perspective", KEY_TRANSFORM_PERSPECTIVE},
};

Key transformNameToKey(const std::string &name) {
  const auto it = kTransformNameToKey.find(name);
  if (it == kTransformNameToKey.end()) {
    throw std::runtime_error("[Reanimated] Unsupported transform: " + name);
  }
  return it->second;
}

// Flattens the transform array directly into the view builder: op `i` becomes
// the key pair (KEY_TRANSFORM_OP_BASE + 2*i) = type code, (... + 1) = value.
void serializeTransform(MapBufferBuilder &viewBuilder, const folly::dynamic &value) {
  react_native_assert(value.isArray() && "[Reanimated] Transform value must be an array");

  MapBuffer::Key slot = 0;
  for (const auto &item : value) {
    react_native_assert(item.isObject() && "[Reanimated] Transform array item must be an object");
    react_native_assert(item.size() == 1 && "[Reanimated] Transform array item must have exactly one key-value pair");
    const auto &transformName = item.keys().begin()->getString();
    const auto transformKey = transformNameToKey(transformName);
    const auto &transformValue = *item.values().begin();

    const MapBuffer::Key typeKey = KEY_TRANSFORM_OP_BASE + 2 * slot;
    const MapBuffer::Key valueKey = typeKey + 1;
    viewBuilder.putInt(typeKey, transformKey);

    switch (transformKey) {
      case KEY_TRANSFORM_SCALE:
      case KEY_TRANSFORM_SCALE_X:
      case KEY_TRANSFORM_SCALE_Y:
      case KEY_TRANSFORM_PERSPECTIVE: {
        viewBuilder.putDouble(valueKey, transformValue.asDouble());
        break;
      }
      case KEY_TRANSFORM_TRANSLATE_X:
      case KEY_TRANSFORM_TRANSLATE_Y: {
        if (transformValue.isDouble()) {
          viewBuilder.putDouble(valueKey, transformValue.getDouble());
        } else if (transformValue.isString()) {
          const auto &transformValueStr = transformValue.getString();
          if (!transformValueStr.ends_with("%")) {
            throw std::runtime_error("[Reanimated] String translate must be a percentage");
          }
          viewBuilder.putString(valueKey, transformValueStr);
        } else {
          throw std::runtime_error("[Reanimated] Translate value must be either a number or a string");
        }
        break;
      }
      case KEY_TRANSFORM_ROTATE:
      case KEY_TRANSFORM_ROTATE_X:
      case KEY_TRANSFORM_ROTATE_Y:
      case KEY_TRANSFORM_ROTATE_Z:
      case KEY_TRANSFORM_SKEW_X:
      case KEY_TRANSFORM_SKEW_Y: {
        const auto &transformValueStr = transformValue.getString();
        if (!transformValueStr.ends_with("deg") && !transformValueStr.ends_with("rad")) {
          throw std::runtime_error("[Reanimated] Unsupported rotation unit: " + transformValueStr);
        }
        viewBuilder.putString(valueKey, transformValueStr);
        break;
      }
      case KEY_TRANSFORM_MATRIX: {
        react_native_assert(transformValue.isArray() && "[Reanimated] Matrix must be an array");
        const auto size = static_cast<MapBuffer::Key>(transformValue.size());
        MapBufferBuilder matrixBuilder(size);
        for (MapBuffer::Key i = 0; i < size; i++) {
          matrixBuilder.putDouble(i, transformValue[i].asDouble());
        }
        viewBuilder.putMapBuffer(valueKey, matrixBuilder.build());
        break;
      }
      default:
        throw std::runtime_error("[Reanimated] Unsupported transform: " + transformName);
    }
    slot++;
  }
}

MapBuffer serializeView(const Tag tag, const folly::dynamic &props) {
  MapBufferBuilder viewBuilder;
  viewBuilder.putInt(KEY_VIEW_TAG, tag);

  for (const auto &[key, value] : props.items()) {
    const auto &propName = key.getString();
    const auto propKey = propNameToKey(propName);
    switch (propKey) {
      case KEY_OPACITY:
      case KEY_ELEVATION:
      case KEY_Z_INDEX:
      case KEY_OUTLINE_OFFSET:
      case KEY_OUTLINE_WIDTH:
        viewBuilder.putDouble(propKey, value.asDouble());
        break;

      case KEY_SHADOW_COLOR:
      case KEY_BACKGROUND_COLOR:
      case KEY_TINT_COLOR:
      case KEY_PLACEHOLDER_TEXT_COLOR:
      case KEY_BORDER_COLOR:
      case KEY_BORDER_TOP_COLOR:
      case KEY_BORDER_BOTTOM_COLOR:
      case KEY_BORDER_LEFT_COLOR:
      case KEY_BORDER_RIGHT_COLOR:
      case KEY_BORDER_START_COLOR:
      case KEY_BORDER_END_COLOR:
      case KEY_BORDER_BLOCK_COLOR:
      case KEY_BORDER_BLOCK_START_COLOR:
      case KEY_BORDER_BLOCK_END_COLOR:
      case KEY_OUTLINE_COLOR:
        viewBuilder.putInt(propKey, value.asInt());
        break;

      case KEY_BORDER_RADIUS:
      case KEY_BORDER_TOP_LEFT_RADIUS:
      case KEY_BORDER_TOP_RIGHT_RADIUS:
      case KEY_BORDER_TOP_START_RADIUS:
      case KEY_BORDER_TOP_END_RADIUS:
      case KEY_BORDER_BOTTOM_LEFT_RADIUS:
      case KEY_BORDER_BOTTOM_RIGHT_RADIUS:
      case KEY_BORDER_BOTTOM_START_RADIUS:
      case KEY_BORDER_BOTTOM_END_RADIUS:
      case KEY_BORDER_START_START_RADIUS:
      case KEY_BORDER_START_END_RADIUS:
      case KEY_BORDER_END_START_RADIUS:
      case KEY_BORDER_END_END_RADIUS:
        if (value.isDouble()) {
          viewBuilder.putDouble(propKey, value.getDouble());
        } else if (value.isString()) {
          const auto &valueStr = value.getString();
          if (!valueStr.ends_with("%")) {
            throw std::runtime_error("[Reanimated] Border radius string must be a percentage");
          }
          viewBuilder.putString(propKey, valueStr);
        } else {
          throw std::runtime_error("[Reanimated] Border radius value must be either a number or a string");
        }
        break;

      case KEY_TRANSFORM:
        serializeTransform(viewBuilder, value);
        break;

      default:
        throw std::runtime_error("[Reanimated] Unsupported prop: " + propName);
    }
  }

  return viewBuilder.build();
}

} // namespace

MapBuffer serializeSynchronousPropsToMapBuffer(const UpdatesBatch &synchronousUpdatesBatch) {
  std::vector<MapBuffer> viewMaps;
  viewMaps.reserve(synchronousUpdatesBatch.size());

  for (const auto &[shadowNodeFamily, props] : synchronousUpdatesBatch) {
    viewMaps.push_back(serializeView(shadowNodeFamily->getTag(), props));
  }

  MapBufferBuilder rootBuilder(1);
  rootBuilder.putMapBufferList(KEY_VIEWS, viewMaps);
  return rootBuilder.build();
}

} // namespace reanimated

#endif // ANDROID
