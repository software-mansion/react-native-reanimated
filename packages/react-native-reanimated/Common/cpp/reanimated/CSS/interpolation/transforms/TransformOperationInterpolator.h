#pragma once

#include <reanimated/CSS/common/values/CSSValue.h>
#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>
#include <reanimated/CSS/interpolation/transforms/operations/perspective.h>

#include <memory>
#include <string>
#include <utility>

namespace reanimated::css {

// Base implementation for simple operations
template <typename OperationType>
class TransformOperationInterpolator
    : public TransformInterpolatorBase<OperationType> {
 public:
  TransformOperationInterpolator(
      std::shared_ptr<OperationType> defaultOperation)
      : TransformInterpolatorBase<OperationType>(defaultOperation) {}

  OperationType interpolate(
      double progress,
      const OperationType &from,
      const OperationType &to,
      const TransformInterpolationContext &context) const override {
    return OperationType{from.value.interpolate(progress, to.value)};
  }
};

// Specialization for PerspectiveOperation
template <>
class TransformOperationInterpolator<PerspectiveOperation>
    : public TransformInterpolatorBase<PerspectiveOperation> {
 public:
  using TransformInterpolatorBase<
      PerspectiveOperation>::TransformInterpolatorBase;

  PerspectiveOperation interpolate(
      double progress,
      const PerspectiveOperation &from,
      const PerspectiveOperation &to,
      const TransformInterpolationContext &context) const override;
};

// Specialization for MatrixOperation
template <>
class TransformOperationInterpolator<MatrixOperation>
    : public TransformInterpolatorBase<MatrixOperation> {
 public:
  using TransformInterpolatorBase<MatrixOperation>::TransformInterpolatorBase;

  MatrixOperation interpolate(
      double progress,
      const MatrixOperation &from,
      const MatrixOperation &to,
      const TransformInterpolationContext &context) const override;
};

// Specialization for resolvable operations
template <ResolvableOperation TOperation>
class TransformOperationInterpolator<TOperation>
    : public TransformInterpolatorBase<TOperation> {
 public:
  TransformOperationInterpolator(
      const std::shared_ptr<TOperation> &defaultOperation,
      ResolvableValueInterpolatorConfig config)
      : TransformInterpolatorBase<TOperation>(defaultOperation),
        config_(std::move(config)) {}

  TOperation interpolate(
      double progress,
      const TOperation &from,
      const TOperation &to,
      const TransformInterpolationContext &context) const override {
    return TOperation{from.value.interpolate(
        progress, to.value, getResolvableValueContext(context))};
  }

  TOperation resolveOperation(
      const TOperation &operation,
      const TransformInterpolationContext &context) const override {
    const auto &resolved =
        operation.value.resolve(getResolvableValueContext(context));

    if (!resolved.has_value()) {
      return TOperation{operation.value};
    }

    return TOperation{resolved.value()};
  }

 private:
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
