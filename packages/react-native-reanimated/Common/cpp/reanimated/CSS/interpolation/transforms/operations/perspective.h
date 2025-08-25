#pragma once

#include <reanimated/CSS/interpolation/transforms/operations/TransformOperation.h>

namespace reanimated::css {

struct PerspectiveOperation final : public TransformOperationBase<CSSDouble> {
  using TransformOperationBase<CSSDouble>::TransformOperationBase;

  explicit PerspectiveOperation(double value);

  TransformOperationType type() const override;
  folly::dynamic valueToDynamic() const override;
  TransformMatrix3D toMatrix() const override;
};

} // namespace reanimated::css
