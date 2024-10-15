#include <reanimated/CSS/interpolation/transforms/RotateTransformInterpolator.h>

namespace reanimated {

template <typename OperationType>
RotateTransformInterpolatorBase<OperationType>::RotateTransformInterpolatorBase(
    const AngleValue &defaultValue)
    : TransformInterpolatorBase<OperationType>(
          std::make_shared<OperationType>(defaultValue)) {}

template <typename OperationType>
OperationType RotateTransformInterpolatorBase<OperationType>::interpolate(
    const double progress,
    const OperationType &fromOperation,
    const OperationType &toOperation,
    const InterpolationUpdateContext &context) const {
  const auto &fromAngle = fromOperation.value;
  const auto &toAngle = toOperation.value;
  return OperationType(
      fromAngle.value + (toAngle.value - fromAngle.value) * progress);
}

// Declare types for RotateTransformInterpolator
template class RotateTransformInterpolatorBase<RotateOperation>;
template class RotateTransformInterpolatorBase<RotateXOperation>;
template class RotateTransformInterpolatorBase<RotateYOperation>;
template class RotateTransformInterpolatorBase<RotateZOperation>;
// Rotate interpolator is also used by skew interpolators
template class RotateTransformInterpolatorBase<SkewXOperation>;
template class RotateTransformInterpolatorBase<SkewYOperation>;

} // namespace reanimated
