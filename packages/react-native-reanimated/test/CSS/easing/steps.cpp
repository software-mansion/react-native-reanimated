#include <reanimated/CSS/easing/steps.h>

namespace reanimated::css {
EasingFunction steps(
    const std::vector<double> &pointsX,
    const std::vector<double> &pointsY) {
  return [=](double x) {
    size_t stepIdx = firstSmallerOrEqual(x, pointsX);
    return pointsY[stepIdx];
  };
}

} // namespace reanimated::css
