#include <reanimated/CSS/easing/linear.h>

namespace reanimated::css {

double interpolateValue(
    double x,
    size_t leftIdx,
    const std::vector<double> &pointsX,
    const std::vector<double> &pointsY) {
  if (leftIdx == pointsX.size() - 1) {
    // We are exactly on the last point of the curve, we just return its y
    // coordinate
    return pointsY[leftIdx];
  }
  const auto rightIdx = leftIdx + 1;
  // Calculate the line equation for the line between leftIdx and rightIdx
  // points
  const auto a = (pointsY[rightIdx] - pointsY[leftIdx]) /
      (pointsX[rightIdx] - pointsX[leftIdx]);
  return pointsY[leftIdx] + a * (x - pointsX[leftIdx]);
}

EasingFunction linear(
    const std::vector<double> &pointsX,
    const std::vector<double> &pointsY) {
  return [=](double x) {
    size_t leftIdx = firstSmallerOrEqual(x, pointsX);
    return interpolateValue(x, leftIdx, pointsX, pointsY);
  };
}

} // namespace reanimated::css
