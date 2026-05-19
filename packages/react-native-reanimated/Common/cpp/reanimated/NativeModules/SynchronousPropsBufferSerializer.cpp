#include <reanimated/NativeModules/SynchronousPropsBufferSerializer.h>

#ifdef ANDROID

#include <react/debug/react_native_assert.h>

#include <cstdint>
#include <stdexcept>
#include <string>
#include <string_view>
#include <unordered_map>

namespace reanimated {

namespace {

// NOTE: Keep in sync with SynchronousPropsBufferParser.kt
enum Command : std::uint8_t {
  CMD_START_OF_VIEW = 1,
  CMD_START_OF_TRANSFORM = 2,
  CMD_END_OF_TRANSFORM = 3,
  CMD_END_OF_VIEW = 4,

  CMD_OPACITY = 10,
  CMD_ELEVATION = 11,
  CMD_Z_INDEX = 12,
  CMD_SHADOW_COLOR = 19,
  CMD_BACKGROUND_COLOR = 15,
  CMD_TINT_COLOR = 17,
  CMD_PLACEHOLDER_TEXT_COLOR = 18,

  CMD_BORDER_RADIUS = 20,
  CMD_BORDER_TOP_LEFT_RADIUS = 21,
  CMD_BORDER_TOP_RIGHT_RADIUS = 22,
  CMD_BORDER_TOP_START_RADIUS = 23,
  CMD_BORDER_TOP_END_RADIUS = 24,
  CMD_BORDER_BOTTOM_LEFT_RADIUS = 25,
  CMD_BORDER_BOTTOM_RIGHT_RADIUS = 26,
  CMD_BORDER_BOTTOM_START_RADIUS = 27,
  CMD_BORDER_BOTTOM_END_RADIUS = 28,
  CMD_BORDER_START_START_RADIUS = 29,
  CMD_BORDER_START_END_RADIUS = 30,
  CMD_BORDER_END_START_RADIUS = 31,
  CMD_BORDER_END_END_RADIUS = 32,

  CMD_BORDER_COLOR = 40,
  CMD_BORDER_TOP_COLOR = 41,
  CMD_BORDER_BOTTOM_COLOR = 42,
  CMD_BORDER_LEFT_COLOR = 43,
  CMD_BORDER_RIGHT_COLOR = 44,
  CMD_BORDER_START_COLOR = 45,
  CMD_BORDER_END_COLOR = 46,
  CMD_BORDER_BLOCK_COLOR = 47,
  CMD_BORDER_BLOCK_START_COLOR = 48,
  CMD_BORDER_BLOCK_END_COLOR = 49,

  CMD_OUTLINE_COLOR = 50,
  CMD_OUTLINE_OFFSET = 51,
  CMD_OUTLINE_WIDTH = 52,

  CMD_TRANSFORM_TRANSLATE_X = 100,
  CMD_TRANSFORM_TRANSLATE_Y = 101,
  CMD_TRANSFORM_SCALE = 102,
  CMD_TRANSFORM_SCALE_X = 103,
  CMD_TRANSFORM_SCALE_Y = 104,
  CMD_TRANSFORM_ROTATE = 105,
  CMD_TRANSFORM_ROTATE_X = 106,
  CMD_TRANSFORM_ROTATE_Y = 107,
  CMD_TRANSFORM_ROTATE_Z = 108,
  CMD_TRANSFORM_SKEW_X = 109,
  CMD_TRANSFORM_SKEW_Y = 110,
  CMD_TRANSFORM_MATRIX = 111,
  CMD_TRANSFORM_PERSPECTIVE = 112,

  CMD_UNIT_DEG = 200,
  CMD_UNIT_RAD = 201,
  CMD_UNIT_PX = 202,
  CMD_UNIT_PERCENT = 203,
};

const std::unordered_map<std::string_view, Command> kPropNameToCommand = {
    {"opacity", CMD_OPACITY},
    {"elevation", CMD_ELEVATION},
    {"zIndex", CMD_Z_INDEX},
    {"shadowColor", CMD_SHADOW_COLOR},
    {"backgroundColor", CMD_BACKGROUND_COLOR},
    {"tintColor", CMD_TINT_COLOR},
    {"placeholderTextColor", CMD_PLACEHOLDER_TEXT_COLOR},
    {"borderRadius", CMD_BORDER_RADIUS},
    {"borderTopLeftRadius", CMD_BORDER_TOP_LEFT_RADIUS},
    {"borderTopRightRadius", CMD_BORDER_TOP_RIGHT_RADIUS},
    {"borderTopStartRadius", CMD_BORDER_TOP_START_RADIUS},
    {"borderTopEndRadius", CMD_BORDER_TOP_END_RADIUS},
    {"borderBottomLeftRadius", CMD_BORDER_BOTTOM_LEFT_RADIUS},
    {"borderBottomRightRadius", CMD_BORDER_BOTTOM_RIGHT_RADIUS},
    {"borderBottomStartRadius", CMD_BORDER_BOTTOM_START_RADIUS},
    {"borderBottomEndRadius", CMD_BORDER_BOTTOM_END_RADIUS},
    {"borderStartStartRadius", CMD_BORDER_START_START_RADIUS},
    {"borderStartEndRadius", CMD_BORDER_START_END_RADIUS},
    {"borderEndStartRadius", CMD_BORDER_END_START_RADIUS},
    {"borderEndEndRadius", CMD_BORDER_END_END_RADIUS},
    {"borderColor", CMD_BORDER_COLOR},
    {"borderTopColor", CMD_BORDER_TOP_COLOR},
    {"borderBottomColor", CMD_BORDER_BOTTOM_COLOR},
    {"borderLeftColor", CMD_BORDER_LEFT_COLOR},
    {"borderRightColor", CMD_BORDER_RIGHT_COLOR},
    {"borderStartColor", CMD_BORDER_START_COLOR},
    {"borderEndColor", CMD_BORDER_END_COLOR},
    {"borderBlockColor", CMD_BORDER_BLOCK_COLOR},
    {"borderBlockStartColor", CMD_BORDER_BLOCK_START_COLOR},
    {"borderBlockEndColor", CMD_BORDER_BLOCK_END_COLOR},
    {"outlineColor", CMD_OUTLINE_COLOR},
    {"outlineOffset", CMD_OUTLINE_OFFSET},
    {"outlineWidth", CMD_OUTLINE_WIDTH},
    {"transform", CMD_START_OF_TRANSFORM},
};

Command propNameToCommand(const std::string &name) {
  const auto it = kPropNameToCommand.find(name);
  if (it == kPropNameToCommand.end()) {
    throw std::runtime_error("[Reanimated] Unsupported style: " + name);
  }
  return it->second;
}

const std::unordered_map<std::string_view, Command> kTransformNameToCommand = {
    {"translateX", CMD_TRANSFORM_TRANSLATE_X},
    {"translateY", CMD_TRANSFORM_TRANSLATE_Y},
    {"scale", CMD_TRANSFORM_SCALE},
    {"scaleX", CMD_TRANSFORM_SCALE_X},
    {"scaleY", CMD_TRANSFORM_SCALE_Y},
    {"rotate", CMD_TRANSFORM_ROTATE},
    {"rotateX", CMD_TRANSFORM_ROTATE_X},
    {"rotateY", CMD_TRANSFORM_ROTATE_Y},
    {"rotateZ", CMD_TRANSFORM_ROTATE_Z},
    {"skewX", CMD_TRANSFORM_SKEW_X},
    {"skewY", CMD_TRANSFORM_SKEW_Y},
    {"matrix", CMD_TRANSFORM_MATRIX},
    {"perspective", CMD_TRANSFORM_PERSPECTIVE},
};

Command transformNameToCommand(const std::string &name) {
  const auto it = kTransformNameToCommand.find(name);
  if (it == kTransformNameToCommand.end()) {
    throw std::runtime_error("[Reanimated] Unsupported transform: " + name);
  }
  return it->second;
}

} // namespace

void serializeSynchronousPropsToBuffers(
    const UpdatesBatch &synchronousUpdatesBatch,
    std::vector<int> &intBuffer,
    std::vector<double> &doubleBuffer) {
  intBuffer.clear();
  doubleBuffer.clear();

  const auto pushInt = [&](int value) {
    intBuffer.push_back(value);
  };

  const auto pushDouble = [&](double value) {
    doubleBuffer.push_back(value);
  };

  for (const auto &[shadowNodeFamily, props] : synchronousUpdatesBatch) {
    pushInt(CMD_START_OF_VIEW);
    pushInt(shadowNodeFamily->getTag());
    for (const auto &[key, value] : props.items()) {
      const auto &propName = key.getString();
      const auto command = propNameToCommand(propName);
      switch (command) {
        case CMD_OPACITY:
        case CMD_ELEVATION:
        case CMD_Z_INDEX:
        case CMD_OUTLINE_OFFSET:
        case CMD_OUTLINE_WIDTH:
          pushInt(command);
          pushDouble(value.asDouble());
          break;

        case CMD_SHADOW_COLOR:
        case CMD_BACKGROUND_COLOR:
        case CMD_TINT_COLOR:
        case CMD_PLACEHOLDER_TEXT_COLOR:
        case CMD_BORDER_COLOR:
        case CMD_BORDER_TOP_COLOR:
        case CMD_BORDER_BOTTOM_COLOR:
        case CMD_BORDER_LEFT_COLOR:
        case CMD_BORDER_RIGHT_COLOR:
        case CMD_BORDER_START_COLOR:
        case CMD_BORDER_END_COLOR:
        case CMD_BORDER_BLOCK_COLOR:
        case CMD_BORDER_BLOCK_START_COLOR:
        case CMD_BORDER_BLOCK_END_COLOR:
        case CMD_OUTLINE_COLOR:
          pushInt(command);
          pushInt(value.asInt());
          break;

        case CMD_BORDER_RADIUS:
        case CMD_BORDER_TOP_LEFT_RADIUS:
        case CMD_BORDER_TOP_RIGHT_RADIUS:
        case CMD_BORDER_TOP_START_RADIUS:
        case CMD_BORDER_TOP_END_RADIUS:
        case CMD_BORDER_BOTTOM_LEFT_RADIUS:
        case CMD_BORDER_BOTTOM_RIGHT_RADIUS:
        case CMD_BORDER_BOTTOM_START_RADIUS:
        case CMD_BORDER_BOTTOM_END_RADIUS:
        case CMD_BORDER_START_START_RADIUS:
        case CMD_BORDER_START_END_RADIUS:
        case CMD_BORDER_END_START_RADIUS:
        case CMD_BORDER_END_END_RADIUS:
          pushInt(command);
          if (value.isDouble()) {
            pushInt(CMD_UNIT_PX);
            pushDouble(value.getDouble());
          } else if (value.isString()) {
            const auto &valueStr = value.getString();
            if (!valueStr.ends_with("%")) {
              throw std::runtime_error("[Reanimated] Border radius string must be a percentage");
            }
            pushInt(CMD_UNIT_PERCENT);
            pushDouble(std::stod(valueStr.substr(0, valueStr.size() - 1)));
          } else {
            throw std::runtime_error("[Reanimated] Border radius value must be either a number or a string");
          }
          break;

        case CMD_START_OF_TRANSFORM:
          pushInt(command);
          react_native_assert(value.isArray() && "[Reanimated] Transform value must be an array");
          for (const auto &item : value) {
            react_native_assert(item.isObject() && "[Reanimated] Transform array item must be an object");
            react_native_assert(
                item.size() == 1 && "[Reanimated] Transform array item must have exactly one key-value pair");
            const auto &transformName = item.keys().begin()->getString();
            const auto transformCommand = transformNameToCommand(transformName);
            const auto &transformValue = *item.values().begin();
            switch (transformCommand) {
              case CMD_TRANSFORM_SCALE:
              case CMD_TRANSFORM_SCALE_X:
              case CMD_TRANSFORM_SCALE_Y:
              case CMD_TRANSFORM_PERSPECTIVE: {
                pushInt(transformCommand);
                pushDouble(transformValue.asDouble());
                break;
              }
              case CMD_TRANSFORM_TRANSLATE_X:
              case CMD_TRANSFORM_TRANSLATE_Y: {
                pushInt(transformCommand);
                if (transformValue.isDouble()) {
                  pushInt(CMD_UNIT_PX);
                  pushDouble(transformValue.getDouble());
                } else if (transformValue.isString()) {
                  const auto &transformValueStr = transformValue.getString();
                  if (!transformValueStr.ends_with("%")) {
                    throw std::runtime_error("[Reanimated] String translate must be a percentage");
                  }
                  pushInt(CMD_UNIT_PERCENT);
                  pushDouble(std::stod(transformValueStr.substr(0, transformValueStr.size() - 1)));
                } else {
                  throw std::runtime_error("[Reanimated] Translate value must be either a number or a string");
                }
                break;
              }
              case CMD_TRANSFORM_ROTATE:
              case CMD_TRANSFORM_ROTATE_X:
              case CMD_TRANSFORM_ROTATE_Y:
              case CMD_TRANSFORM_ROTATE_Z:
              case CMD_TRANSFORM_SKEW_X:
              case CMD_TRANSFORM_SKEW_Y: {
                const auto &transformValueStr = transformValue.getString();
                pushInt(transformCommand);
                if (transformValueStr.ends_with("deg")) {
                  pushInt(CMD_UNIT_DEG);
                } else if (transformValueStr.ends_with("rad")) {
                  pushInt(CMD_UNIT_RAD);
                } else {
                  throw std::runtime_error("[Reanimated] Unsupported rotation unit: " + transformValueStr);
                }
                pushDouble(std::stod(transformValueStr.substr(0, transformValueStr.size() - 3)));
                break;
              }
              case CMD_TRANSFORM_MATRIX: {
                pushInt(transformCommand);
                react_native_assert(transformValue.isArray() && "[Reanimated] Matrix must be an array");
                int size = transformValue.size();
                pushInt(size);
                for (int i = 0; i < size; i++) {
                  pushDouble(transformValue[i].asDouble());
                }
                break;
              }
              default:
                throw std::runtime_error("[Reanimated] Unsupported transform: " + transformName);
            }
          }
          pushInt(CMD_END_OF_TRANSFORM);
          break;

        default:
          throw std::runtime_error("[Reanimated] Unsupported prop: " + propName);
      }
    }
    pushInt(CMD_END_OF_VIEW);
  }
}

} // namespace reanimated

#endif // ANDROID
