#include <reanimated/CSS/interpolation/transforms/ScaleTransformInterpolator.h>

namespace reanimated {

template <typename OperationType>
ScaleTransformInterpolatorBase<OperationType>::ScaleTransformInterpolatorBase(
    const double &defaultValue)
    : TransformInterpolatorBase<OperationType>(
          std::make_shared<OperationType>(defaultValue)) {}

template <typename OperationType>
OperationType ScaleTransformInterpolatorBase<OperationType>::interpolate(
    const double progress,
    const OperationType &fromOperation,
    const OperationType &toOperation,
    const TransformInterpolatorUpdateContext &context) const {
  return fromOperation.value +
      (toOperation.value - fromOperation.value) * progress;
}

// Declare types for ScaleTransformInterpolator
template class ScaleTransformInterpolatorBase<ScaleOperation>;
template class ScaleTransformInterpolatorBase<ScaleXOperation>;
template class ScaleTransformInterpolatorBase<ScaleYOperation>;

} // namespace reanimated
