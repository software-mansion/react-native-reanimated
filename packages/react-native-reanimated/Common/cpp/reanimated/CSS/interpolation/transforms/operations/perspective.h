#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <memory>

namespace reanimated::css {

struct PerspectiveOperation final : public TransformOperationBase<TransformOp::Perspective, CSSDouble> {
  using TransformOperationBase<TransformOp::Perspective, CSSDouble>::TransformOperationBase;

  explicit PerspectiveOperation(double value);

  bool is3D() const override;
  folly::dynamic valueToDynamic() const override;
  TransformMatrix::Shared toMatrix(bool /* force3D */) const override;
};

} // namespace reanimated::css
