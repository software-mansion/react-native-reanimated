#pragma once

#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>
#include <reanimated/CSS/interpolation/transforms/operations/perspective.h>

#include <memory>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

template <typename TOperation>
concept ResolvableTransformOp = requires(TOperation operation) {
  { operation.value } -> std::convertible_to<typename std::remove_reference_t<decltype(operation.value)>>;
  requires Resolvable<std::remove_reference_t<decltype(operation.value)>>;
}; // NOLINT(readability/braces)

class TransformInterpolator {
 public:
  using Interpolators = std::unordered_map<TransformOp, std::shared_ptr<TransformInterpolator>>;

  struct UpdateContext {
    const std::shared_ptr<const ShadowNode> &node;
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository;
    const std::shared_ptr<Interpolators> &interpolators;
  };

  virtual ~TransformInterpolator() = default;

  virtual std::shared_ptr<TransformOperation> getDefaultOperation() const = 0;
  virtual std::unique_ptr<TransformOperation> interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const UpdateContext &context) const = 0;
  virtual std::shared_ptr<TransformOperation> resolveOperation(
      const std::shared_ptr<TransformOperation> &operation,
      const UpdateContext &context) const;
};

using TransformOperationInterpolators = TransformInterpolator::Interpolators;
using TransformInterpolationContext = TransformInterpolator::UpdateContext;

// Base class with common functionality
template <typename TOperation>
class TransformOperationInterpolatorBase : public TransformInterpolator {
 public:
  explicit TransformOperationInterpolatorBase(std::shared_ptr<TOperation> defaultOperation)
      : defaultOperation_(defaultOperation) {}

  std::shared_ptr<TransformOperation> getDefaultOperation() const override {
    return defaultOperation_;
  }

 protected:
  std::shared_ptr<TOperation> defaultOperation_;
};

// Base implementation for simple operations
template <typename TOperation>
class TransformOperationInterpolator : public TransformOperationInterpolatorBase<TOperation> {
 public:
  explicit TransformOperationInterpolator(const std::shared_ptr<TOperation> &defaultOperation);

  std::unique_ptr<TransformOperation> interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const TransformInterpolationContext &context) const override;
};

// Specialization for PerspectiveOperation
template <>
class TransformOperationInterpolator<PerspectiveOperation>
    : public TransformOperationInterpolatorBase<PerspectiveOperation> {
 public:
  explicit TransformOperationInterpolator(const std::shared_ptr<PerspectiveOperation> &defaultOperation);

  std::unique_ptr<TransformOperation> interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const TransformInterpolationContext &context) const override;
};

// Specialization for MatrixOperation
template <>
class TransformOperationInterpolator<MatrixOperation> : public TransformOperationInterpolatorBase<MatrixOperation> {
 public:
  explicit TransformOperationInterpolator(const std::shared_ptr<MatrixOperation> &defaultOperation);

  std::unique_ptr<TransformOperation> interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const TransformInterpolationContext &context) const override;

 protected:
  template <typename MatrixType>
  MatrixType interpolateMatrix(double progress, const TransformMatrix::Shared &from, const TransformMatrix::Shared &to)
      const;

  TransformMatrix::Shared matrixFromOperation(
      const std::shared_ptr<TransformOperation> &operation,
      bool shouldBe3D,
      const TransformInterpolationContext &context) const;
};

// Specialization for resolvable operations
template <ResolvableTransformOp TOperation>
class TransformOperationInterpolator<TOperation> : public TransformOperationInterpolatorBase<TOperation> {
 public:
  TransformOperationInterpolator(
      const std::shared_ptr<TOperation> &defaultOperation,
      ResolvableValueInterpolatorConfig config);

  std::unique_ptr<TransformOperation> interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const TransformInterpolationContext &context) const override;

  std::shared_ptr<TransformOperation> resolveOperation(
      const std::shared_ptr<TransformOperation> &operation,
      const TransformInterpolationContext &context) const override;

 protected:
  const ResolvableValueInterpolatorConfig config_;

  ResolvableValueInterpolationContext getResolvableValueContext(const TransformInterpolationContext &context) const;
};

} // namespace reanimated::css
