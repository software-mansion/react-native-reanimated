#pragma once

#include <reanimated/CSS/common/TransformMatrix.h>
#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

namespace reanimated {

class MatrixTransformInterpolator
    : public TransformInterpolatorBase<MatrixOperation> {
 public:
  MatrixTransformInterpolator(const TransformMatrix &defaultValue);

 protected:
  MatrixOperation interpolate(
      const double progress,
      const MatrixOperation &fromOperation,
      const MatrixOperation &toOperation,
      const TransformInterpolatorUpdateContext &context) const override;

  TransformMatrix matrixFromOperation(
      const MatrixOperation &operation,
      const TransformInterpolatorUpdateContext &context) const;
};

} // namespace reanimated
