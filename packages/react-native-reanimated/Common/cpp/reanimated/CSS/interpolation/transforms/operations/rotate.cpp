#include <reanimated/CSS/interpolation/transforms/operations/rotate.h>

namespace reanimated::css {

// Rotate

TransformMatrix3D RotateOperation::toMatrix() const {
  return TransformMatrix3D::RotateZ(value.value);
}

// RotateX

TransformMatrix3D RotateXOperation::toMatrix() const {
  return TransformMatrix3D::RotateX(value.value);
}

// RotateY

TransformMatrix3D RotateYOperation::toMatrix() const {
  return TransformMatrix3D::RotateY(value.value);
}

// RotateZ

bool RotateZOperation::canConvertTo(TransformOp type) const {
  return type == TransformOp::Rotate;
}

TransformOperations RotateZOperation::convertTo(TransformOp type) const {
  assertCanConvertTo(type);
  return {std::make_shared<RotateOperation>(value)};
}

TransformMatrix3D RotateZOperation::toMatrix() const {
  return TransformMatrix3D::RotateZ(value.value);
}

} // namespace reanimated::css
