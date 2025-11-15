#pragma once

#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/operations/StyleOperationInterpolator.h>
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

using TransformOperationInterpolators = StyleOperationInterpolators;
using TransformInterpolationContext = StyleOperationsInterpolationContext;

template <typename TOperation>
class TransformOperationInterpolator : public StyleOperationInterpolatorBase<TOperation> {
 public:
  explicit TransformOperationInterpolator(const std::shared_ptr<TOperation> &defaultOperation);
};

template <>
class TransformOperationInterpolator<PerspectiveOperation> : public StyleOperationInterpolatorBase<PerspectiveOperation> {
 public:
  explicit TransformOperationInterpolator(const std::shared_ptr<PerspectiveOperation> &defaultOperation);

  std::unique_ptr<StyleOperation> interpolate(
      double progress,
      const std::shared_ptr<StyleOperation> &from,
      const std::shared_ptr<StyleOperation> &to,
      const StyleOperationsInterpolationContext &context) const override;
};

template <>
class TransformOperationInterpolator<MatrixOperation> : public StyleOperationInterpolatorBase<MatrixOperation> {
 public:
  explicit TransformOperationInterpolator(const std::shared_ptr<MatrixOperation> &defaultOperation);

  std::unique_ptr<StyleOperation> interpolate(
      double progress,
      const std::shared_ptr<StyleOperation> &from,
      const std::shared_ptr<StyleOperation> &to,
      const StyleOperationsInterpolationContext &context) const override;

 protected:
  template <typename MatrixType>
  MatrixType interpolateMatrix(double progress, const TransformMatrix::Shared &from, const TransformMatrix::Shared &to)
      const;

  TransformMatrix::Shared matrixFromOperation(
      const std::shared_ptr<TransformOperation> &operation,
      bool shouldBe3D,
      const StyleOperationsInterpolationContext &context) const;
};

template <ResolvableTransformOp TOperation>
class TransformOperationInterpolator<TOperation> : public StyleOperationInterpolatorBase<TOperation> {
 public:
  TransformOperationInterpolator(
      const std::shared_ptr<TOperation> &defaultOperation,
      ResolvableValueInterpolatorConfig config);
};

} // namespace reanimated::css
