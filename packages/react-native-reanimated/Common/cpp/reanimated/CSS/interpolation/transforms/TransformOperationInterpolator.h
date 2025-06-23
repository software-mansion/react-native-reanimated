#pragma once

#include <reanimated/CSS/common/values/CSSValue.h>
#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <memory>
#include <string>

namespace reanimated::css {

template <typename TOperation>
concept ResolvableOperation = requires(TOperation operation) {
  {
    operation.value
  } -> std::convertible_to<
      typename std::remove_reference_t<decltype(operation.value)>>;
  requires Resolvable<std::remove_reference_t<decltype(operation.value)>>;
}; // NOLINT(readability/braces)

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
      const TransformInterpolatorUpdateContext &context) const override {
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
      const TransformInterpolatorUpdateContext &context) const override;
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
      const TransformInterpolatorUpdateContext &context) const override;

 private:
  TransformMatrix matrixFromOperation(
      const MatrixOperation &matrixOperation,
      const TransformInterpolatorUpdateContext &context) const;
};

// Specialization for resolvable operations
template <ResolvableOperation TOperation>
class TransformOperationInterpolator<TOperation>
    : public TransformInterpolatorBase<TOperation> {
 public:
  TransformOperationInterpolator(
      const std::shared_ptr<TOperation> &defaultOperation,
      RelativeTo relativeTo,
      const std::string &relativeProperty)
      : TransformInterpolatorBase<TOperation>(defaultOperation),
        relativeTo_(relativeTo),
        relativeProperty_(relativeProperty) {}

  TOperation interpolate(
      double progress,
      const TOperation &from,
      const TOperation &to,
      const TransformInterpolatorUpdateContext &context) const override {
    return TOperation{from.value.interpolate(
        progress, to.value, getResolvableValueContext(context))};
  }

  TOperation resolveOperation(
      const TOperation &operation,
      const TransformInterpolatorUpdateContext &context) const override {
    const auto &resolved =
        operation.value.resolve(getResolvableValueContext(context));

    if (!resolved.has_value()) {
      return TOperation{operation.value};
    }

    return TOperation{resolved.value()};
  }

 private:
  const RelativeTo relativeTo_;
  const std::string relativeProperty_;

  CSSResolvableValueInterpolationContext getResolvableValueContext(
      const TransformInterpolatorUpdateContext &context) const {
    return {
        .node = context.node,
        .viewStylesRepository = context.viewStylesRepository,
        .relativeProperty = relativeProperty_,
        .relativeTo = relativeTo_,
    };
  }
};

} // namespace reanimated::css
