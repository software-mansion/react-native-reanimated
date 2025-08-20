#pragma once

#include <reanimated/CSS/interpolation/transforms/operations/TransformOperation.h>

namespace reanimated::css {

// Skew
struct SkewOperation : public TransformOperationBase<CSSAngle> {
  using TransformOperationBase<CSSAngle>::TransformOperationBase;

  explicit SkewOperation(const std::string &value);

  folly::dynamic valueToDynamic() const override;
};

struct SkewXOperation final : public SkewOperation {
  using SkewOperation::SkewOperation;

  TransformOperationType type() const override;
  TransformMatrix3D toMatrix() const override;
};

struct SkewYOperation final : public SkewOperation {
  using SkewOperation::SkewOperation;

  TransformOperationType type() const override;
  TransformMatrix3D toMatrix() const override;
};

} // namespace reanimated::css
