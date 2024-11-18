#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/TransformMatrix.h>
#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

#include <memory>

namespace reanimated {

class MatrixTransformInterpolator final
    : public TransformInterpolatorBase<MatrixOperation> {
 public:
  explicit MatrixTransformInterpolator(const TransformMatrix &defaultValue);

 protected:
  MatrixOperation interpolate(
      double progress,
      const MatrixOperation &fromOperation,
      const MatrixOperation &toOperation,
      const TransformInterpolatorUpdateContext &context) const override;

  static TransformMatrix matrixFromOperation(
      const MatrixOperation &operation,
      const TransformInterpolatorUpdateContext &context);
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
