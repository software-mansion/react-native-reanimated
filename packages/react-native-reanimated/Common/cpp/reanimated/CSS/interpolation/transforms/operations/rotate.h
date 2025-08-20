#pragma once

#include <reanimated/CSS/interpolation/transforms/operations/TransformOperation.h>

#include <memory>
#include <string>

namespace reanimated::css {

// Rotate
struct RotateOperation : public TransformOperationBase<CSSAngle> {
  using TransformOperationBase<CSSAngle>::TransformOperationBase;

  explicit RotateOperation(const std::string &value);

  TransformOperationType type() const override;
  folly::dynamic valueToDynamic() const override;
  TransformMatrix3D toMatrix() const override;
};

struct RotateXOperation final : public RotateOperation {
  using RotateOperation::RotateOperation;

  TransformOperationType type() const override;
  TransformMatrix3D toMatrix() const override;
};

struct RotateYOperation final : public RotateOperation {
  using RotateOperation::RotateOperation;

  TransformOperationType type() const override;
  TransformMatrix3D toMatrix() const override;
};

struct RotateZOperation final : public RotateOperation {
  using RotateOperation::RotateOperation;

  TransformOperationType type() const override;
  TransformMatrix3D toMatrix() const override;
  bool canConvertTo(TransformOperationType type) const override;
  TransformOperations convertTo(TransformOperationType type) const override;
};

} // namespace reanimated::css
