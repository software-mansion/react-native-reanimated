#include <reanimated/CSS/easing/linear.h>

namespace reanimated::css {

LinearEasing::LinearEasing(
    std::vector<double> pointsX,
    std::vector<double> pointsY)
    : pointsX_(std::move(pointsX)), pointsY_(std::move(pointsY)) {}

double LinearEasing::interpolateValue(const double x, const std::size_t leftIdx)
    const {
  if (leftIdx == pointsX_.size() - 1) {
    // We are exactly on the last point of the curve, we just return its y
    // coordinate
    return pointsY_[leftIdx];
  }
  const auto rightIdx = leftIdx + 1;
  // Calculate the line equation for the line between leftIdx and rightIdx
  // points
  const auto a = (pointsY_[rightIdx] - pointsY_[leftIdx]) /
      (pointsX_[rightIdx] - pointsX_[leftIdx]);
  return pointsY_[leftIdx] + a * (x - pointsX_[leftIdx]);
}

double LinearEasing::calculate(const double t) const {
  const auto leftIdx = firstSmallerOrEqual(t, pointsX_);
  return interpolateValue(t, leftIdx);
}

bool LinearEasing::operator==(
    const EasingBase<EasingType::Linear> &other) const {
  const auto &otherLinear = static_cast<const LinearEasing &>(other);
  return pointsX_ == otherLinear.pointsX_ && pointsY_ == otherLinear.pointsY_;
}

std::shared_ptr<LinearEasing> linear(
    std::vector<double> pointsX,
    std::vector<double> pointsY) {
  return std::make_shared<LinearEasing>(std::move(pointsX), std::move(pointsY));
}

} // namespace reanimated::css
