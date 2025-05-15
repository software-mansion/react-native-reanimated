#include <reanimated/CSS/easing/steps.h>

namespace reanimated::css {

StepsEasing::StepsEasing(
    std::vector<double> pointsX,
    std::vector<double> pointsY)
    : pointsX_(std::move(pointsX)), pointsY_(std::move(pointsY)) {}

double StepsEasing::calculate(const double t) const {
  const auto stepIdx = firstSmallerOrEqual(t, pointsX_);
  return pointsY_[stepIdx];
}

bool StepsEasing::operator==(const EasingBase<EasingType::Steps> &other) const {
  const auto &otherSteps = static_cast<const StepsEasing &>(other);
  return pointsX_ == otherSteps.pointsX_ && pointsY_ == otherSteps.pointsY_;
}

std::shared_ptr<StepsEasing> steps(
    std::vector<double> pointsX,
    std::vector<double> pointsY) {
  return std::make_shared<StepsEasing>(std::move(pointsX), std::move(pointsY));
}

} // namespace reanimated::css
