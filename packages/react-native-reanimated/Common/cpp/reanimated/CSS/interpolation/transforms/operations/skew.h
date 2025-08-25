#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

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

  TransformMatrix3D toMatrix() const override {
    return TransformMatrix3D::create<TOperation>(this->value.value);
  }
};

using SkewXOperation = SkewOperationBase<TransformOp::SkewX>;

using SkewYOperation = SkewOperationBase<TransformOp::SkewY>;

} // namespace reanimated::css
