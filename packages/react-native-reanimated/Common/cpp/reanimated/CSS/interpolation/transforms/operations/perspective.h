#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <memory>

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

  TransformMatrix::Shared toMatrix(bool /* force3D */) const override {
    if (!cachedMatrix_) {
      // Perspective is a 3D operation
      cachedMatrix_ = std::make_shared<const TransformMatrix3D>(
          TransformMatrix3D::create<TransformOp::Perspective>(value.value));
    }
    return cachedMatrix_;
  }
};

} // namespace reanimated::css
