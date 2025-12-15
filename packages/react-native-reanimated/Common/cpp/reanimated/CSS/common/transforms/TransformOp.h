#pragma once

#include <string>

namespace reanimated::css {

enum class TransformOp : uint8_t {
  Perspective,
  Rotate,
  RotateX,
  RotateY,
  RotateZ,
  Scale,
  ScaleX,
  ScaleY,
  TranslateX,
  TranslateY,
  SkewX,
  SkewY,
  Matrix,
};

TransformOp getTransformOperationType(const std::string &property);
std::string getTransformOperationName(const TransformOp type);

} // namespace reanimated::css
