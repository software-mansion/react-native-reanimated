#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <memory>
#include <string>

namespace reanimated::css {

template <TransformOp TOperation>
struct RotateOperationBase2D
    : public TransformOperationBase<TOperation, CSSAngle> {
  using TransformOperationBase<TOperation, CSSAngle>::TransformOperationBase;

  explicit RotateOperationBase2D(const std::string &value)
      : TransformOperationBase<TOperation, CSSAngle>(CSSAngle(value)) {}

  folly::dynamic valueToDynamic() const override {
    return this->value.toDynamic();
  }
};

template <TransformOp TOperation>
struct RotateOperationBase3D : public RotateOperationBase2D<TOperation> {
  using RotateOperationBase2D<TOperation>::RotateOperationBase2D;

  bool is3D() const override {
    return true;
  }

  TransformMatrix::Shared toMatrix(bool /* force3D */) const override {
    return std::make_shared<const TransformMatrix3D>(
        TransformMatrix3D::create<TOperation>(this->value.value));
  }
};

using RotateOperation = RotateOperationBase2D<TransformOp::Rotate>;
using RotateXOperation = RotateOperationBase3D<TransformOp::RotateX>;
using RotateYOperation = RotateOperationBase3D<TransformOp::RotateY>;

struct RotateZOperation final
    : public RotateOperationBase2D<TransformOp::RotateZ> {
  using RotateOperationBase2D<TransformOp::RotateZ>::RotateOperationBase2D;

  bool canConvertTo(TransformOp type) const override {
    return type == TransformOp::Rotate;
  }

  TransformOperations convertTo(TransformOp type) const override {
    assertCanConvertTo(type);
    return {std::make_shared<RotateOperation>(value)};
  }
};

} // namespace reanimated::css
