#include <reanimated/CSS/common/transforms/TransformOp.h>

#include <array>
#include <unordered_map>

namespace reanimated::css {

constexpr std::array<const char *, 13> transformOperationStrings = {
    "perspective",
    "rotate",
    "rotateX",
    "rotateY",
    "rotateZ",
    "scale",
    "scaleX",
    "scaleY",
    "translateX",
    "translateY",
    "skewX",
    "skewY",
    "matrix"};

TransformOp getTransformOperationType(const std::string &property) {
  static const std::unordered_map<std::string, TransformOp> stringToEnumMap = {
      {"perspective", TransformOp::Perspective},
      {"rotate", TransformOp::Rotate},
      {"rotateX", TransformOp::RotateX},
      {"rotateY", TransformOp::RotateY},
      {"rotateZ", TransformOp::RotateZ},
      {"scale", TransformOp::Scale},
      {"scaleX", TransformOp::ScaleX},
      {"scaleY", TransformOp::ScaleY},
      {"translateX", TransformOp::TranslateX},
      {"translateY", TransformOp::TranslateY},
      {"skewX", TransformOp::SkewX},
      {"skewY", TransformOp::SkewY},
      {"matrix", TransformOp::Matrix}};

  auto it = stringToEnumMap.find(property);
  if (it != stringToEnumMap.end()) {
    return it->second;
  } else {
    throw std::invalid_argument(
        "[Reanimated] Unknown transform operation: " + property);
  }
}

std::string getOperationNameFromType(const TransformOp type) {
  return transformOperationStrings[static_cast<size_t>(type)];
}

} // namespace reanimated::css
