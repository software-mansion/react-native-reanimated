#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSValue.h>
#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <memory>
#include <string>

namespace reanimated {

template <typename T>
concept ResolvableOperation =
    requires(T t) {
      {
        t.value
      } -> std::convertible_to<
          typename std::remove_reference_t<decltype(t.value)>>;
      requires Resolvable<std::remove_reference_t<decltype(t.value)>>;
    };

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
  TransformOperationInterpolator(
      std::shared_ptr<PerspectiveOperation> defaultOperation)
      : TransformInterpolatorBase<PerspectiveOperation>(defaultOperation) {}

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
  TransformOperationInterpolator(
      std::shared_ptr<MatrixOperation> defaultOperation)
      : TransformInterpolatorBase<MatrixOperation>(defaultOperation) {}

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
template <ResolvableOperation OperationType>
class TransformOperationInterpolator<OperationType>
    : public TransformInterpolatorBase<OperationType> {
 public:
  TransformOperationInterpolator(
      const std::shared_ptr<OperationType> &defaultOperation,
      RelativeTo relativeTo,
      const std::string &relativeProperty)
      : TransformInterpolatorBase<OperationType>(defaultOperation),
        relativeTo_(relativeTo),
        relativeProperty_(relativeProperty) {}

  OperationType interpolate(
      double progress,
      const OperationType &from,
      const OperationType &to,
      const TransformInterpolatorUpdateContext &context) const override {
    return OperationType{from.value.interpolate(
        progress, to.value, getResolvableValueContext(context))};
  }

  OperationType resolveOperation(
      const OperationType &operation,
      const TransformInterpolatorUpdateContext &context) const override {
    const auto &resolved =
        operation.value.resolve(getResolvableValueContext(context));

    if (!resolved.has_value()) {
      return OperationType{operation.value};
    }

    return OperationType{resolved.value()};
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

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
