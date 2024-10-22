#include <reanimated/CSS/interpolation/transforms/PerspectiveTransformInterpolator.h>

namespace reanimated {

PerspectiveTransformInterpolator::PerspectiveTransformInterpolator(
    const double &defaultValue)
    : TransformInterpolatorBase<PerspectiveOperation>(
          std::make_shared<PerspectiveOperation>(defaultValue)) {}

PerspectiveOperation PerspectiveTransformInterpolator::interpolate(
    const double progress,
    const PerspectiveOperation &fromOperation,
    const PerspectiveOperation &toOperation,
    const TransformInterpolatorUpdateContext &context) const {
  if (toOperation.value == 0)
    return 0;
  if (fromOperation.value == 0)
    return toOperation.value;

  return fromOperation.value +
      (toOperation.value - fromOperation.value) * progress;
}

} // namespace reanimated
