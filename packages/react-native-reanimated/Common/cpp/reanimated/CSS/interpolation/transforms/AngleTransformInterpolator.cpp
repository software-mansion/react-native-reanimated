#include <reanimated/CSS/interpolation/transforms/AngleTransformInterpolator.h>

namespace reanimated {

template <typename OperationType>
AngleTransformInterpolator<OperationType>::AngleTransformInterpolator(
    const AngleValue &defaultValue)
    : TransformInterpolatorBase<OperationType>(
          std::make_shared<OperationType>(defaultValue)) {}

template <typename OperationType>
OperationType AngleTransformInterpolator<OperationType>::interpolate(
    const double progress,
    const OperationType &fromOperation,
    const OperationType &toOperation,
    const TransformInterpolatorUpdateContext &context) const {
  const auto &fromAngle = fromOperation.value;
  const auto &toAngle = toOperation.value;

  return OperationType(AngleValue(
      fromAngle.value + (toAngle.value - fromAngle.value) * progress));
}

// Declare types for rotation transform interpolators
template class AngleTransformInterpolator<RotateOperation>;
template class AngleTransformInterpolator<RotateXOperation>;
template class AngleTransformInterpolator<RotateYOperation>;
template class AngleTransformInterpolator<RotateZOperation>;
// Declare types for skew transform interpolators
template class AngleTransformInterpolator<SkewXOperation>;
template class AngleTransformInterpolator<SkewYOperation>;

} // namespace reanimated
