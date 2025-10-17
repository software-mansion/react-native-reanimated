#pragma once

#include <string>

namespace reanimated::css {

enum class TransformOp {
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

std::string getOperationNameFromType(const TransformOp type);

} // namespace reanimated::css
