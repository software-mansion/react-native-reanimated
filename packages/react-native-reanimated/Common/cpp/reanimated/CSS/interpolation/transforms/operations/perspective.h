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

  bool is3D() const override {
    return true;
  }

  std::unique_ptr<TransformMatrix> toMatrix(bool /* force3D */) const override {
    // Perspective is a 3D operation
    return TransformMatrix3D::create<TransformOp::Perspective>(value.value);
  }
};

} // namespace reanimated::css
