#pragma once

#include <reanimated/CSS/interpolation/transforms/operations/TransformOperation.h>

#include <memory>

namespace reanimated::css {

struct ScaleOperation : public TransformOperationBase<CSSDouble> {
  using TransformOperationBase<CSSDouble>::TransformOperationBase;

  explicit ScaleOperation(double value);

  TransformOperationType type() const override;
  folly::dynamic valueToDynamic() const override;
  bool canConvertTo(TransformOperationType type) const override;
  TransformOperations convertTo(TransformOperationType type) const override;
  TransformMatrix3D toMatrix() const override;
};

struct ScaleXOperation final : public ScaleOperation {
  using ScaleOperation::ScaleOperation;

  TransformOperationType type() const override;
  TransformMatrix3D toMatrix() const override;
};

struct ScaleYOperation final : public ScaleOperation {
  using ScaleOperation::ScaleOperation;

  TransformOperationType type() const override;
  TransformMatrix3D toMatrix() const override;
};

} // namespace reanimated::css
