#include <reanimated/CSS/interpolation/transforms/MatrixTransformInterpolator.h>

namespace reanimated {

MatrixTransformInterpolator::MatrixTransformInterpolator(
    const TransformMatrix &defaultValue)
    : TransformInterpolatorBase<MatrixOperation>(
          std::make_shared<MatrixOperation>(defaultValue)) {}

MatrixOperation MatrixTransformInterpolator::interpolate(
    const double progress,
    const MatrixOperation &fromOperation,
    const MatrixOperation &toOperation,
    const InterpolationUpdateContext &context) const {
  // TODO implement matrix interpolation
  return fromOperation;
}

} // namespace reanimated
