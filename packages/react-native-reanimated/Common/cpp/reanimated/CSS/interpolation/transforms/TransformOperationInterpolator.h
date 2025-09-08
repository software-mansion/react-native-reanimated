#pragma once

#include <reanimated/CSS/common/values/CSSValue.h>
#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>
#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>
#include <reanimated/CSS/interpolation/transforms/operations/perspective.h>

#include <algorithm>
#include <iterator>
#include <memory>
#include <string>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

template <typename TOperation>
concept ResolvableTransformOp = requires(TOperation operation) {
  {
    operation.value
  } -> std::convertible_to<
      typename std::remove_reference_t<decltype(operation.value)>>;
  requires Resolvable<std::remove_reference_t<decltype(operation.value)>>;
}; // NOLINT(readability/braces)

class TransformInterpolator {
 public:
  using Interpolators =
      std::unordered_map<TransformOp, std::shared_ptr<TransformInterpolator>>;

  struct UpdateContext {
    const std::shared_ptr<const ShadowNode> &node;
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository;
    const std::shared_ptr<Interpolators> &interpolators;
  };

  virtual ~TransformInterpolator() = default;

  virtual std::shared_ptr<TransformOperation> getDefaultOperation() const = 0;
  virtual folly::dynamic interpolate(
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
template <typename OperationType>
class TransformOperationInterpolatorBase : public TransformInterpolator {
 public:
  TransformOperationInterpolatorBase(
      std::shared_ptr<OperationType> defaultOperation)
      : defaultOperation_(defaultOperation) {}

  std::shared_ptr<TransformOperation> getDefaultOperation() const override {
    return defaultOperation_;
  }

 protected:
  std::shared_ptr<OperationType> defaultOperation_;
};

// Base implementation for simple operations
template <typename OperationType>
class TransformOperationInterpolator
    : public TransformOperationInterpolatorBase<OperationType> {
 public:
  TransformOperationInterpolator(
      std::shared_ptr<OperationType> defaultOperation)
      : TransformOperationInterpolatorBase<OperationType>(defaultOperation) {}

  folly::dynamic interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const TransformInterpolationContext &context) const override {
    const auto &fromOp = *std::static_pointer_cast<OperationType>(from);
    const auto &toOp = *std::static_pointer_cast<OperationType>(to);
    return OperationType(fromOp.value.interpolate(progress, toOp.value))
        .toDynamic();
  }
};

// Specialization for PerspectiveOperation
template <>
class TransformOperationInterpolator<PerspectiveOperation>
    : public TransformOperationInterpolatorBase<PerspectiveOperation> {
 public:
  TransformOperationInterpolator(
      std::shared_ptr<PerspectiveOperation> defaultOperation)
      : TransformOperationInterpolatorBase<PerspectiveOperation>(
            defaultOperation) {}

  folly::dynamic interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const TransformInterpolationContext &context) const override;
};

// Specialization for MatrixOperation
template <>
class TransformOperationInterpolator<MatrixOperation>
    : public TransformOperationInterpolatorBase<MatrixOperation> {
 public:
  TransformOperationInterpolator(
      std::shared_ptr<MatrixOperation> defaultOperation)
      : TransformOperationInterpolatorBase<MatrixOperation>(defaultOperation) {}

  folly::dynamic interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const TransformInterpolationContext &context) const override;

 protected:
  TransformMatrix::Shared matrixFromOperation(
      const std::shared_ptr<TransformOperation> &operation,
      bool shouldBe3D,
      const TransformInterpolationContext &context) const;
};

// Specialization for resolvable operations
template <ResolvableTransformOp TOperation>
class TransformOperationInterpolator<TOperation>
    : public TransformOperationInterpolatorBase<TOperation> {
 public:
  TransformOperationInterpolator(
      const std::shared_ptr<TOperation> &defaultOperation,
      ResolvableValueInterpolatorConfig config)
      : TransformOperationInterpolatorBase<TOperation>(defaultOperation),
        config_(std::move(config)) {}

  folly::dynamic interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const TransformInterpolationContext &context) const override {
    const auto &fromOp = *std::static_pointer_cast<TOperation>(from);
    const auto &toOp = *std::static_pointer_cast<TOperation>(to);
    return TOperation(
               fromOp.value.interpolate(
                   progress, toOp.value, getResolvableValueContext(context)))
        .toDynamic();
  }

  std::shared_ptr<TransformOperation> resolveOperation(
      const std::shared_ptr<TransformOperation> &operation,
      const TransformInterpolationContext &context) const override {
    const auto &resolvableOp = std::static_pointer_cast<TOperation>(operation);
    const auto &resolved =
        resolvableOp->value.resolve(getResolvableValueContext(context));

    if (!resolved.has_value()) {
      throw std::invalid_argument(
          "[Reanimated] Cannot resolve resolvable operation: " +
          operation->getOperationName() +
          " for node with tag: " + std::to_string(context.node->getTag()));
    }

    return std::make_shared<TOperation>(resolved.value());
  }

 protected:
  const ResolvableValueInterpolatorConfig config_;

  ResolvableValueInterpolationContext getResolvableValueContext(
      const TransformInterpolationContext &context) const {
    return ResolvableValueInterpolationContext{
        .node = context.node,
        .viewStylesRepository = context.viewStylesRepository,
        .relativeProperty = config_.relativeProperty,
        .relativeTo = config_.relativeTo};
  }
};

} // namespace reanimated::css
