#pragma once

#include <reanimated/CSS/interpolation/transforms/operations/TransformOperation.h>

#include <memory>

namespace reanimated::css {

template <TransformOp TOperation>
struct ScaleOperationBase
    : public TransformOperationBase<TOperation, CSSDouble> {
  using TransformOperationBase<TOperation, CSSDouble>::TransformOperationBase;

  explicit ScaleOperationBase(const double value)
      : TransformOperationBase<TOperation, CSSDouble>(CSSDouble(value)) {}

  folly::dynamic valueToDynamic() const override {
    return this->value.toDynamic();
  }
};

// Scale

struct ScaleOperation final : public ScaleOperationBase<TransformOp::Scale> {
  using ScaleOperationBase<TransformOp::Scale>::ScaleOperationBase;

  bool canConvertTo(TransformOp type) const override;
  TransformOperations convertTo(TransformOp type) const override;
  TransformMatrix3D toMatrix() const override;
};

// ScaleX

struct ScaleXOperation final : public ScaleOperationBase<TransformOp::ScaleX> {
  using ScaleOperationBase<TransformOp::ScaleX>::ScaleOperationBase;

  TransformMatrix3D toMatrix() const override;
};

// ScaleY

struct ScaleYOperation final : public ScaleOperationBase<TransformOp::ScaleY> {
  using ScaleOperationBase<TransformOp::ScaleY>::ScaleOperationBase;

  TransformMatrix3D toMatrix() const override;
};

} // namespace reanimated::css
