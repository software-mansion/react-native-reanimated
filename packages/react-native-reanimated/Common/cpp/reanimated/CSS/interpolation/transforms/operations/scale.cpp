#include <reanimated/CSS/interpolation/transforms/operations/scale.h>

namespace reanimated::css {

// Scale

ScaleOperation::ScaleOperation(const double value)
    : TransformOperationBase<CSSDouble>(CSSDouble(value)) {}

TransformOperationType ScaleOperation::type() const {
  return TransformOperationType::Scale;
}

folly::dynamic ScaleOperation::valueToDynamic() const {
  return value.toDynamic();
}

bool ScaleOperation::canConvertTo(TransformOperationType type) const {
  return type == TransformOperationType::ScaleX ||
      type == TransformOperationType::ScaleY;
}

TransformOperations ScaleOperation::convertTo(
    TransformOperationType type) const {
  assertCanConvertTo(type);
  if (type == TransformOperationType::ScaleX) {
    return {
        std::make_shared<ScaleXOperation>(value),
        std::make_shared<ScaleYOperation>(value)};
  } else {
    return {
        std::make_shared<ScaleYOperation>(value),
        std::make_shared<ScaleXOperation>(value)};
  }
}

TransformMatrix3D ScaleOperation::toMatrix() const {
  return TransformMatrix3D::Scale(value.value);
}

// ScaleX

TransformOperationType ScaleXOperation::type() const {
  return TransformOperationType::ScaleX;
}

TransformMatrix3D ScaleXOperation::toMatrix() const {
  return TransformMatrix3D::ScaleX(value.value);
}

// ScaleY

TransformOperationType ScaleYOperation::type() const {
  return TransformOperationType::ScaleY;
}

TransformMatrix3D ScaleYOperation::toMatrix() const {
  return TransformMatrix3D::ScaleY(value.value);
}

} // namespace reanimated::css
