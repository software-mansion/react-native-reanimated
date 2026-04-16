#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/CSS/interpolation/transforms/operations/rotate.h>

#include <memory>
#include <string>

namespace reanimated::css {

template <TransformOp TOperation>
RotateOperationBase2D<TOperation>::RotateOperationBase2D(const std::string &value)
    : TransformOperationBase<TOperation, CSSAngle>(CSSAngle(value)) {}

template <TransformOp TOperation>
RotateOperationBase3D<TOperation>::RotateOperationBase3D(const std::string &value)
    : TransformOperationBase<TOperation, CSSAngle>(CSSAngle(value)) {}

template <TransformOp TOperation>
bool RotateOperationBase3D<TOperation>::is3D() const {
  return true;
}

template <TransformOp TOperation>
TransformMatrix::Shared RotateOperationBase3D<TOperation>::toMatrix(bool /* force3D */) const {
  return std::make_shared<const TransformMatrix3D>(TransformMatrix3D::create<TOperation>(this->value.value));
}

bool RotateZOperation::canConvertTo(TransformOp type) const {
  return type == TransformOp::Rotate;
}

TransformOperations RotateZOperation::convertTo(TransformOp type) const {
  assertCanConvertTo(type);
  return {std::make_shared<RotateOperation>(value)};
}

template struct RotateOperationBase2D<TransformOp::Rotate>;
template struct RotateOperationBase2D<TransformOp::RotateZ>;
template struct RotateOperationBase3D<TransformOp::RotateX>;
template struct RotateOperationBase3D<TransformOp::RotateY>;

} // namespace reanimated::css
