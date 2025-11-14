#pragma once

#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>
#include <reanimated/CSS/interpolation/transforms/operations/perspective.h>

#include <memory>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

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

} // namespace reanimated::css
