#include <reanimated/CSS/interpolation/transforms/ScaleTransformInterpolator.h>

namespace reanimated {

template <typename OperationType>
ScaleTransformInterpolator<OperationType>::ScaleTransformInterpolator(
    const double defaultValue)
    : TransformInterpolatorBase<OperationType>(
          std::make_shared<OperationType>(defaultValue)) {}

template <typename OperationType>
OperationType ScaleTransformInterpolator<OperationType>::interpolate(
    const double progress,
    const OperationType &fromOperation,
    const OperationType &toOperation,
    const TransformInterpolatorUpdateContext &context) const {
  return OperationType(
      fromOperation.value +
      (toOperation.value - fromOperation.value) * progress);
}

// Declare types for scale transform interpolators
template class ScaleTransformInterpolator<ScaleOperation>;
template class ScaleTransformInterpolator<ScaleXOperation>;
template class ScaleTransformInterpolator<ScaleYOperation>;

} // namespace reanimated
