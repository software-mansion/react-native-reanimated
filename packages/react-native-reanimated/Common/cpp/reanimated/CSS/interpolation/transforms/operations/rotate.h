#pragma once

#include <reanimated/CSS/interpolation/transforms/operations/TransformOperation.h>

#include <memory>
#include <string>

namespace reanimated::css {

template <TransformOp TOperation>
struct RotateOperationBase
    : public TransformOperationBase<TOperation, CSSAngle> {
  using TransformOperationBase<TOperation, CSSAngle>::TransformOperationBase;

  explicit RotateOperationBase(const std::string &value)
      : TransformOperationBase<TOperation, CSSAngle>(CSSAngle(value)) {}

  folly::dynamic valueToDynamic() const override {
    return this->value.toDynamic();
  }
};

// Rotate

struct RotateOperation final : public RotateOperationBase<TransformOp::Rotate> {
  using RotateOperationBase<TransformOp::Rotate>::RotateOperationBase;

  TransformMatrix3D toMatrix() const override;
};

// RotateX

struct RotateXOperation final
    : public RotateOperationBase<TransformOp::RotateX> {
  using RotateOperationBase<TransformOp::RotateX>::RotateOperationBase;

  TransformMatrix3D toMatrix() const override;
};

// RotateY

struct RotateYOperation final
    : public RotateOperationBase<TransformOp::RotateY> {
  using RotateOperationBase<TransformOp::RotateY>::RotateOperationBase;

  TransformMatrix3D toMatrix() const override;
};

// RotateZ

struct RotateZOperation final
    : public RotateOperationBase<TransformOp::RotateZ> {
  using RotateOperationBase<TransformOp::RotateZ>::RotateOperationBase;

  TransformMatrix3D toMatrix() const override;
  bool canConvertTo(TransformOp type) const override;
  TransformOperations convertTo(TransformOp type) const override;
};

} // namespace reanimated::css
