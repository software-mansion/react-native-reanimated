#include <reanimated/CSS/interpolation/transforms/operations/skew.h>

namespace reanimated::css {

SkewOperation::SkewOperation(const std::string &value)
    : TransformOperationBase<CSSAngle>(CSSAngle(value)) {}

folly::dynamic SkewOperation::valueToDynamic() const {
  return value.toDynamic();
}

// SkewX

TransformOperationType SkewXOperation::type() const {
  return TransformOperationType::SkewX;
}

TransformMatrix3D SkewXOperation::toMatrix() const {
  return TransformMatrix3D::SkewX(value.value);
}

// SkewY

TransformOperationType SkewYOperation::type() const {
  return TransformOperationType::SkewY;
}

TransformMatrix3D SkewYOperation::toMatrix() const {
  return TransformMatrix3D::SkewY(value.value);
}

} // namespace reanimated::css
