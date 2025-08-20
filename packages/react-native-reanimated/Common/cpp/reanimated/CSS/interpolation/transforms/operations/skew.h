#pragma once

#include <reanimated/CSS/interpolation/transforms/operations/TransformOperation.h>

#include <string>

namespace reanimated::css {

template <TransformOp TOperation>
struct SkewOperationBase : public TransformOperationBase<TOperation, CSSAngle> {
  using TransformOperationBase<TOperation, CSSAngle>::TransformOperationBase;

  explicit SkewOperationBase(const std::string &value)
      : TransformOperationBase<TOperation, CSSAngle>(CSSAngle(value)) {}

  folly::dynamic valueToDynamic() const override {
    return this->value.toDynamic();
  }
};

// SkewX

struct SkewXOperation final : public SkewOperationBase<TransformOp::SkewX> {
  using SkewOperationBase<TransformOp::SkewX>::SkewOperationBase;

  TransformMatrix3D toMatrix() const override;
};

// SkewY

struct SkewYOperation final : public SkewOperationBase<TransformOp::SkewY> {
  using SkewOperationBase<TransformOp::SkewY>::SkewOperationBase;

  TransformMatrix3D toMatrix() const override;
};

} // namespace reanimated::css
