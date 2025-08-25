#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

namespace reanimated::css {

struct PerspectiveOperation final
    : public TransformOperationBase<TransformOp::Perspective, CSSDouble> {
  using TransformOperationBase<TransformOp::Perspective, CSSDouble>::
      TransformOperationBase;

  explicit PerspectiveOperation(double value)
      : TransformOperationBase<TransformOp::Perspective, CSSDouble>(
            CSSDouble(value)) {}

  folly::dynamic valueToDynamic() const override {
    return value.value != 0 ? value.toDynamic() : folly::dynamic();
  }

  TransformMatrix3D toMatrix() const override {
    return TransformMatrix3D::create<TransformOp::Perspective>(value.value);
  }
};

} // namespace reanimated::css
