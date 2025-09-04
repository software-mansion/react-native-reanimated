#pragma once

#include <reanimated/CSS/common/values/CSSValue.h>
#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>
#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>
#include <reanimated/CSS/interpolation/transforms/operations/perspective.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

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
  virtual std::shared_ptr<TransformOperation> interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const TransformInterpolationContext &context) const = 0;
};

using TransformOperationInterpolators = TransformInterpolator::Interpolators;
using TransformInterpolationContext = TransformInterpolator::UpdateContext;

// Base implementation for simple operations
template <typename OperationType>
class TransformOperationInterpolator : public TransformInterpolator {
 public:
  TransformOperationInterpolator(
      std::shared_ptr<OperationType> defaultOperation)
      : defaultOperation_(defaultOperation) {}

  std::shared_ptr<TransformOperation> getDefaultOperation() const override {
    return defaultOperation_;
  }

  std::shared_ptr<TransformOperation> interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const TransformInterpolationContext &context) const override {
    const auto &fromOp = *std::static_pointer_cast<OperationType>(from);
    const auto &toOp = *std::static_pointer_cast<OperationType>(to);
    return std::make_shared<OperationType>(
        fromOp.value.interpolate(progress, toOp.value));
  }

 private:
  std::shared_ptr<OperationType> defaultOperation_;
};

// Specialization for PerspectiveOperation
template <>
class TransformOperationInterpolator<PerspectiveOperation>
    : public TransformInterpolator {
 public:
  TransformOperationInterpolator(
      std::shared_ptr<PerspectiveOperation> defaultOperation)
      : defaultOperation_(defaultOperation) {}

  std::shared_ptr<TransformOperation> getDefaultOperation() const override {
    return defaultOperation_;
  }

  std::shared_ptr<TransformOperation> interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const TransformInterpolationContext &context) const override;

 private:
  std::shared_ptr<PerspectiveOperation> defaultOperation_;
};

// Specialization for MatrixOperation
template <>
class TransformOperationInterpolator<MatrixOperation>
    : public TransformInterpolator {
 public:
  TransformOperationInterpolator(
      std::shared_ptr<MatrixOperation> defaultOperation)
      : defaultOperation_(defaultOperation) {}

  std::shared_ptr<TransformOperation> getDefaultOperation() const override {
    return defaultOperation_;
  }

  std::shared_ptr<TransformOperation> interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const TransformInterpolationContext &context) const override;

 private:
  std::shared_ptr<MatrixOperation> defaultOperation_;

  std::shared_ptr<TransformMatrix> resolveMatrix(
      const std::shared_ptr<TransformMatrix> &matrix,
      const TransformInterpolationContext &context,
      bool force3D) const;
};

// Specialization for resolvable operations
template <ResolvableOperation TOperation>
class TransformOperationInterpolator<TOperation>
    : public TransformInterpolator {
 public:
  TransformOperationInterpolator(
      const std::shared_ptr<TOperation> &defaultOperation,
      ResolvableValueInterpolatorConfig config)
      : defaultOperation_(defaultOperation), config_(std::move(config)) {}

  std::shared_ptr<TransformOperation> getDefaultOperation() const override {
    return defaultOperation_;
  }

  std::shared_ptr<TransformOperation> interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const TransformInterpolationContext &context) const override {
    const auto &fromOp = *std::static_pointer_cast<TOperation>(from);
    const auto &toOp = *std::static_pointer_cast<TOperation>(to);
    return std::make_shared<TOperation>(fromOp.value.interpolate(
        progress, toOp.value, getResolvableValueContext(context)));
  }

 private:
  std::shared_ptr<TOperation> defaultOperation_;
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
