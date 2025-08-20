#pragma once

#include <reanimated/CSS/interpolation/transforms/operations/TransformOperation.h>

namespace reanimated::css {

struct PerspectiveOperation final
    : public TransformOperationBase<TransformOp::Perspective, CSSDouble> {
  using TransformOperationBase<TransformOp::Perspective, CSSDouble>::
      TransformOperationBase;

  explicit PerspectiveOperation(double value)
      : TransformOperationBase<TransformOp::Perspective, CSSDouble>(
            CSSDouble(value)) {}

  folly::dynamic valueToDynamic() const override;
  TransformMatrix3D toMatrix() const override;
};

} // namespace reanimated::css
