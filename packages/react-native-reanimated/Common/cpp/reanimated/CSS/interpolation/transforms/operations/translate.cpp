#include <reanimated/CSS/interpolation/transforms/operations/translate.h>

namespace reanimated::css {

TranslateOperation::TranslateOperation(const double value)
    : TransformOperationBase<CSSLength>(CSSLength(value)) {}

TranslateOperation::TranslateOperation(const std::string &value)
    : TransformOperationBase<CSSLength>(CSSLength(value)) {}

bool TranslateOperation::isRelative() const {
  return value.isRelative;
}

folly::dynamic TranslateOperation::valueToDynamic() const {
  return value.toDynamic();
}

TransformMatrix3D TranslateOperation::toMatrix() const {
  return toMatrix(value.value);
}

// TranslateX

TransformOperationType TranslateXOperation::type() const {
  return TransformOperationType::TranslateX;
}

TransformMatrix3D TranslateXOperation::toMatrix(double resolvedValue) const {
  if (value.isRelative) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert relative translateX to the matrix.");
  }
  return TransformMatrix3D::TranslateX(resolvedValue);
}

// TranslateY

TransformOperationType TranslateYOperation::type() const {
  return TransformOperationType::TranslateY;
}

TransformMatrix3D TranslateYOperation::toMatrix(double resolvedValue) const {
  if (value.isRelative) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert relative translateY to the matrix.");
  }
  return TransformMatrix3D::TranslateY(resolvedValue);
}

} // namespace reanimated::css
