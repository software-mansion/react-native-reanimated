#include <reanimated/CSS/interpolation/transforms/operations/rotate.h>

namespace reanimated::css {

RotateOperation::RotateOperation(const std::string &value)
    : TransformOperationBase<CSSAngle>(CSSAngle(value)) {}

TransformOperationType RotateOperation::type() const {
  return TransformOperationType::Rotate;
}

folly::dynamic RotateOperation::valueToDynamic() const {
  return value.toDynamic();
}

TransformMatrix3D RotateOperation::toMatrix() const {
  return TransformMatrix3D::RotateZ(value.value);
}

// RotateX

TransformOperationType RotateXOperation::type() const {
  return TransformOperationType::RotateX;
}

TransformMatrix3D RotateXOperation::toMatrix() const {
  return TransformMatrix3D::RotateX(value.value);
}

// RotateY

TransformOperationType RotateYOperation::type() const {
  return TransformOperationType::RotateY;
}

TransformMatrix3D RotateYOperation::toMatrix() const {
  return TransformMatrix3D::RotateY(value.value);
}

// RotateZ

TransformOperationType RotateZOperation::type() const {
  return TransformOperationType::RotateZ;
}

bool RotateZOperation::canConvertTo(TransformOperationType type) const {
  return type == TransformOperationType::Rotate;
}

TransformOperations RotateZOperation::convertTo(
    TransformOperationType type) const {
  assertCanConvertTo(type);
  return {std::make_shared<RotateOperation>(value)};
}

TransformMatrix3D RotateZOperation::toMatrix() const {
  return TransformMatrix3D::RotateZ(value.value);
}

} // namespace reanimated::css
