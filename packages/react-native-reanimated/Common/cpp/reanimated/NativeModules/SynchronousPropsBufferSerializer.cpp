#include <reanimated/NativeModules/SynchronousPropsBufferSerializer.h>

#include <react/debug/react_native_assert.h>

#include <stdexcept>
#include <string>

namespace reanimated {

void serializeSynchronousPropsToBuffers(
    const UpdatesBatch &synchronousUpdatesBatch,
    std::vector<int> &intBuffer,
    std::vector<double> &doubleBuffer) {
  // NOTE: Keep in sync with SynchronousPropsBufferParser.kt
  static constexpr auto CMD_START_OF_VIEW = 1;
  static constexpr auto CMD_START_OF_TRANSFORM = 2;
  static constexpr auto CMD_END_OF_TRANSFORM = 3;
  static constexpr auto CMD_END_OF_VIEW = 4;

  static constexpr auto CMD_OPACITY = 10;
  static constexpr auto CMD_ELEVATION = 11;
  static constexpr auto CMD_Z_INDEX = 12;
  static constexpr auto CMD_SHADOW_OPACITY = 13;
  static constexpr auto CMD_SHADOW_RADIUS = 14;
  static constexpr auto CMD_BACKGROUND_COLOR = 15;
  static constexpr auto CMD_COLOR = 16;
  static constexpr auto CMD_TINT_COLOR = 17;

  static constexpr auto CMD_BORDER_RADIUS = 20;
  static constexpr auto CMD_BORDER_TOP_LEFT_RADIUS = 21;
  static constexpr auto CMD_BORDER_TOP_RIGHT_RADIUS = 22;
  static constexpr auto CMD_BORDER_TOP_START_RADIUS = 23;
  static constexpr auto CMD_BORDER_TOP_END_RADIUS = 24;
  static constexpr auto CMD_BORDER_BOTTOM_LEFT_RADIUS = 25;
  static constexpr auto CMD_BORDER_BOTTOM_RIGHT_RADIUS = 26;
  static constexpr auto CMD_BORDER_BOTTOM_START_RADIUS = 27;
  static constexpr auto CMD_BORDER_BOTTOM_END_RADIUS = 28;
  static constexpr auto CMD_BORDER_START_START_RADIUS = 29;
  static constexpr auto CMD_BORDER_START_END_RADIUS = 30;
  static constexpr auto CMD_BORDER_END_START_RADIUS = 31;
  static constexpr auto CMD_BORDER_END_END_RADIUS = 32;

  static constexpr auto CMD_BORDER_COLOR = 40;
  static constexpr auto CMD_BORDER_TOP_COLOR = 41;
  static constexpr auto CMD_BORDER_BOTTOM_COLOR = 42;
  static constexpr auto CMD_BORDER_LEFT_COLOR = 43;
  static constexpr auto CMD_BORDER_RIGHT_COLOR = 44;
  static constexpr auto CMD_BORDER_START_COLOR = 45;
  static constexpr auto CMD_BORDER_END_COLOR = 46;

  static constexpr auto CMD_TRANSFORM_TRANSLATE_X = 100;
  static constexpr auto CMD_TRANSFORM_TRANSLATE_Y = 101;
  static constexpr auto CMD_TRANSFORM_SCALE = 102;
  static constexpr auto CMD_TRANSFORM_SCALE_X = 103;
  static constexpr auto CMD_TRANSFORM_SCALE_Y = 104;
  static constexpr auto CMD_TRANSFORM_ROTATE = 105;
  static constexpr auto CMD_TRANSFORM_ROTATE_X = 106;
  static constexpr auto CMD_TRANSFORM_ROTATE_Y = 107;
  static constexpr auto CMD_TRANSFORM_ROTATE_Z = 108;
  static constexpr auto CMD_TRANSFORM_SKEW_X = 109;
  static constexpr auto CMD_TRANSFORM_SKEW_Y = 110;
  static constexpr auto CMD_TRANSFORM_MATRIX = 111;
  static constexpr auto CMD_TRANSFORM_PERSPECTIVE = 112;

  static constexpr auto CMD_UNIT_DEG = 200;
  static constexpr auto CMD_UNIT_RAD = 201;
  static constexpr auto CMD_UNIT_PX = 202;
  static constexpr auto CMD_UNIT_PERCENT = 203;

  const auto propNameToCommand = [](const std::string &name) {
    if (name == "opacity")
      return CMD_OPACITY;

    if (name == "elevation")
      return CMD_ELEVATION;

    if (name == "zIndex")
      return CMD_Z_INDEX;

    if (name == "shadowOpacity")
      return CMD_SHADOW_OPACITY;

    if (name == "shadowRadius")
      return CMD_SHADOW_RADIUS;

    if (name == "backgroundColor")
      return CMD_BACKGROUND_COLOR;

    if (name == "color")
      return CMD_COLOR;

    if (name == "tintColor")
      return CMD_TINT_COLOR;

    if (name == "borderRadius")
      return CMD_BORDER_RADIUS;

    if (name == "borderTopLeftRadius")
      return CMD_BORDER_TOP_LEFT_RADIUS;

    if (name == "borderTopRightRadius")
      return CMD_BORDER_TOP_RIGHT_RADIUS;

    if (name == "borderTopStartRadius")
      return CMD_BORDER_TOP_START_RADIUS;

    if (name == "borderTopEndRadius")
      return CMD_BORDER_TOP_END_RADIUS;

    if (name == "borderBottomLeftRadius")
      return CMD_BORDER_BOTTOM_LEFT_RADIUS;

    if (name == "borderBottomRightRadius")
      return CMD_BORDER_BOTTOM_RIGHT_RADIUS;

    if (name == "borderBottomStartRadius")
      return CMD_BORDER_BOTTOM_START_RADIUS;

    if (name == "borderBottomEndRadius")
      return CMD_BORDER_BOTTOM_END_RADIUS;

    if (name == "borderStartStartRadius")
      return CMD_BORDER_START_START_RADIUS;

    if (name == "borderStartEndRadius")
      return CMD_BORDER_START_END_RADIUS;

    if (name == "borderEndStartRadius")
      return CMD_BORDER_END_START_RADIUS;

    if (name == "borderEndEndRadius")
      return CMD_BORDER_END_END_RADIUS;

    if (name == "borderColor")
      return CMD_BORDER_COLOR;

    if (name == "borderTopColor")
      return CMD_BORDER_TOP_COLOR;

    if (name == "borderBottomColor")
      return CMD_BORDER_BOTTOM_COLOR;

    if (name == "borderLeftColor")
      return CMD_BORDER_LEFT_COLOR;

    if (name == "borderRightColor")
      return CMD_BORDER_RIGHT_COLOR;

    if (name == "borderStartColor")
      return CMD_BORDER_START_COLOR;

    if (name == "borderEndColor")
      return CMD_BORDER_END_COLOR;

    if (name == "transform")
      return CMD_START_OF_TRANSFORM; // TODO: use CMD_TRANSFORM?

    throw std::runtime_error("[Reanimated] Unsupported style: " + name);
  };

  const auto transformNameToCommand = [](const std::string &name) {
    if (name == "translateX")
      return CMD_TRANSFORM_TRANSLATE_X;

    if (name == "translateY")
      return CMD_TRANSFORM_TRANSLATE_Y;

    if (name == "scale")
      return CMD_TRANSFORM_SCALE;

    if (name == "scaleX")
      return CMD_TRANSFORM_SCALE_X;

    if (name == "scaleY")
      return CMD_TRANSFORM_SCALE_Y;

    if (name == "rotate")
      return CMD_TRANSFORM_ROTATE;

    if (name == "rotateX")
      return CMD_TRANSFORM_ROTATE_X;

    if (name == "rotateY")
      return CMD_TRANSFORM_ROTATE_Y;

    if (name == "rotateZ")
      return CMD_TRANSFORM_ROTATE_Z;

    if (name == "skewX")
      return CMD_TRANSFORM_SKEW_X;

    if (name == "skewY")
      return CMD_TRANSFORM_SKEW_Y;

    if (name == "matrix")
      return CMD_TRANSFORM_MATRIX;

    if (name == "perspective")
      return CMD_TRANSFORM_PERSPECTIVE;

    throw std::runtime_error("[Reanimated] Unsupported transform: " + name);
  };

  for (const auto &[shadowNodeFamily, props] : synchronousUpdatesBatch) {
    intBuffer.push_back(CMD_START_OF_VIEW);
    intBuffer.push_back(shadowNodeFamily->getTag());
    for (const auto &[key, value] : props.items()) {
      const auto &propName = key.getString();
      const auto command = propNameToCommand(propName);
      switch (command) {
        case CMD_OPACITY:
        case CMD_ELEVATION:
        case CMD_Z_INDEX:
        case CMD_SHADOW_OPACITY:
        case CMD_SHADOW_RADIUS:
          intBuffer.push_back(command);
          doubleBuffer.push_back(value.asDouble());
          break;

        case CMD_BACKGROUND_COLOR:
        case CMD_COLOR:
        case CMD_TINT_COLOR:
        case CMD_BORDER_COLOR:
        case CMD_BORDER_TOP_COLOR:
        case CMD_BORDER_BOTTOM_COLOR:
        case CMD_BORDER_LEFT_COLOR:
        case CMD_BORDER_RIGHT_COLOR:
        case CMD_BORDER_START_COLOR:
        case CMD_BORDER_END_COLOR:
          intBuffer.push_back(command);
          intBuffer.push_back(value.asInt());
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
          intBuffer.push_back(command);
          if (value.isDouble()) {
            intBuffer.push_back(CMD_UNIT_PX);
            doubleBuffer.push_back(value.getDouble());
          } else if (value.isString()) {
            const auto &valueStr = value.getString();
            if (!valueStr.ends_with("%")) {
              throw std::runtime_error("[Reanimated] Border radius string must be a percentage");
            }
            intBuffer.push_back(CMD_UNIT_PERCENT);
            doubleBuffer.push_back(std::stof(valueStr.substr(0, -1)));
          } else {
            throw std::runtime_error("[Reanimated] Border radius value must be either a number or a string");
          }
          break;

        case CMD_START_OF_TRANSFORM:
          intBuffer.push_back(command);
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
                intBuffer.push_back(transformCommand);
                doubleBuffer.push_back(transformValue.asDouble());
                break;
              }
              case CMD_TRANSFORM_TRANSLATE_X:
              case CMD_TRANSFORM_TRANSLATE_Y: {
                intBuffer.push_back(transformCommand);
                if (transformValue.isDouble()) {
                  intBuffer.push_back(CMD_UNIT_PX);
                  doubleBuffer.push_back(transformValue.getDouble());
                } else if (transformValue.isString()) {
                  const auto &transformValueStr = transformValue.getString();
                  if (!transformValueStr.ends_with("%")) {
                    throw std::runtime_error("[Reanimated] String translate must be a percentage");
                  }
                  intBuffer.push_back(CMD_UNIT_PERCENT);
                  doubleBuffer.push_back(std::stof(transformValueStr.substr(0, -1)));
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
                intBuffer.push_back(transformCommand);
                if (transformValueStr.ends_with("deg")) {
                  intBuffer.push_back(CMD_UNIT_DEG);
                } else if (transformValueStr.ends_with("rad")) {
                  intBuffer.push_back(CMD_UNIT_RAD);
                } else {
                  throw std::runtime_error("[Reanimated] Unsupported rotation unit: " + transformValueStr);
                }
                doubleBuffer.push_back(std::stof(transformValueStr.substr(0, -3)));
                break;
              }
              case CMD_TRANSFORM_MATRIX: {
                intBuffer.push_back(transformCommand);
                react_native_assert(transformValue.isArray() && "[Reanimated] Matrix must be an array");
                int size = transformValue.size();
                intBuffer.push_back(size);
                for (int i = 0; i < size; i++) {
                  doubleBuffer.push_back(transformValue[i].asDouble());
                }
                break;
              }
              default:
                throw std::runtime_error("[Reanimated] Unsupported transform: " + transformName);
            }
          }
          intBuffer.push_back(CMD_END_OF_TRANSFORM);
          break;

        default:
          throw std::runtime_error("[Reanimated] Unsupported prop: " + propName);
      }
    }
    intBuffer.push_back(CMD_END_OF_VIEW);
  }
}

} // namespace reanimated
