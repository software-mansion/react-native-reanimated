#include <reanimated/CSS/easing/StepsEasing.h>

namespace reanimated {
EasingFunction createStepsEasingFunction(
    std::vector<double> arrX,
    std::vector<double> arrY) {
  return [=](double x) {
    size_t stepIdx = firstSmallerThanOrEqualBinsearch(x, arrX);
    return arrY[stepIdx];
  };
}

} // namespace reanimated
