#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformMatrix.h>

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
      const InterpolationUpdateContext &context) const override;
};

} // namespace reanimated
