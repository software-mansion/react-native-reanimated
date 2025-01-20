#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/easing/steps.h>

namespace reanimated {
EasingFunction steps(
    const std::vector<double> &pointsX,
    const std::vector<double> &pointsY) {
  return [=](double x) {
    size_t stepIdx = firstSmallerOrEqual(x, pointsX);
    return pointsY[stepIdx];
  };
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
