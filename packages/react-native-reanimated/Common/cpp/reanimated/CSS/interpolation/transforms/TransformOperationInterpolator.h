#pragma once

#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/operations/StyleOperationInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>
#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>
#include <reanimated/CSS/interpolation/transforms/operations/perspective.h>

#include <memory>

namespace reanimated::css {

// Base implementation for simple operations
template <typename TOperation>
class TransformOperationInterpolator : public StyleOperationInterpolatorBase<TransformOperation> {
 public:
  explicit TransformOperationInterpolator(const std::shared_ptr<TransformOperation> &defaultOperation)
      : StyleOperationInterpolatorBase<TransformOperation>(defaultOperation) {}

  std::unique_ptr<StyleOperation> interpolateTyped(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const UpdateContext &context) const override;
};

// Specialization for PerspectiveOperation
template <>
class TransformOperationInterpolator<PerspectiveOperation> : public StyleOperationInterpolatorBase<TransformOperation> {
 public:
  explicit TransformOperationInterpolator(const std::shared_ptr<PerspectiveOperation> &defaultOperation)
      : StyleOperationInterpolatorBase<TransformOperation>(
            std::static_pointer_cast<TransformOperation>(defaultOperation)) {}

  std::unique_ptr<StyleOperation> interpolateTyped(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const UpdateContext &context) const override;
};

// Specialization for MatrixOperation
template <>
class TransformOperationInterpolator<MatrixOperation> : public StyleOperationInterpolatorBase<TransformOperation> {
 public:
  explicit TransformOperationInterpolator(const std::shared_ptr<MatrixOperation> &defaultOperation)
      : StyleOperationInterpolatorBase<TransformOperation>(
            std::static_pointer_cast<TransformOperation>(defaultOperation)) {}

  std::unique_ptr<StyleOperation> interpolateTyped(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const UpdateContext &context) const override;

 protected:
  template <typename MatrixType>
  MatrixType interpolateMatrix(double progress, const TransformMatrix::Shared &from, const TransformMatrix::Shared &to)
      const;

  TransformMatrix::Shared matrixFromOperation(
      const std::shared_ptr<TransformOperation> &operation,
      bool shouldBe3D,
      const UpdateContext &context) const;
};

// Specialization for resolvable operations
template <ResolvableOp TOperation>
class TransformOperationInterpolator<TOperation> : public ResolvableOperationInterpolatorBase<TransformOperation> {
 public:
  TransformOperationInterpolator(
      const std::shared_ptr<TransformOperation> &defaultOperation,
      ResolvableValueInterpolatorConfig config)
      : ResolvableOperationInterpolatorBase<TransformOperation>(defaultOperation, std::move(config)) {}

  std::unique_ptr<StyleOperation> interpolateTyped(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const UpdateContext &context) const override;

  std::shared_ptr<StyleOperation> resolveTypedOperation(
      const std::shared_ptr<TransformOperation> &operation,
      const UpdateContext &context) const override;
};

} // namespace reanimated::css
