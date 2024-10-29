#include <reanimated/CSS/easing/LinearParametrizedEasing.h>

double interpolateValue(
    double x,
    size_t leftIdx,
    const std::vector<double> &arrX,
    const std::vector<double> &arrY) {
  if (leftIdx == arrX.size() - 1) {
    // We are exactly on the last point of the curve, we just return its y
    // coordinate
    return arrY[leftIdx];
  }
  size_t rightIdx = leftIdx + 1;
  // Calculate the line equation for the line between leftIdx and rightIdx
  // points
  double a =
      (arrY[rightIdx] - arrY[leftIdx]) / (arrX[rightIdx] - arrX[leftIdx]);
  return arrY[leftIdx] + a * (x - arrX[leftIdx]);
}

namespace reanimated {

EasingFunction createLinearEasingFunction(
    const std::vector<double>& arrX,
    const std::vector<double>& arrY) {
  return [=](double x) {
    size_t leftIdx = firstSmallerThanOrEqualBinsearch(x, arrX);
    return interpolateValue(x, leftIdx, arrX, arrY);
  };
}

} // namespace reanimated
