#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/transforms/PerspectiveTransformInterpolator.h>

namespace reanimated {

PerspectiveTransformInterpolator::PerspectiveTransformInterpolator(
    const double defaultValue)
    : TransformInterpolatorBase<PerspectiveOperation>(
          std::make_shared<PerspectiveOperation>(defaultValue)) {}

PerspectiveOperation PerspectiveTransformInterpolator::interpolate(
    const double progress,
    const PerspectiveOperation &fromOperation,
    const PerspectiveOperation &toOperation,
    const TransformInterpolatorUpdateContext &context) const {
  if (toOperation.value == 0)
    return PerspectiveOperation(0);
  if (fromOperation.value == 0)
    return PerspectiveOperation(toOperation.value);

  return PerspectiveOperation(
      fromOperation.value +
      (toOperation.value - fromOperation.value) * progress);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
