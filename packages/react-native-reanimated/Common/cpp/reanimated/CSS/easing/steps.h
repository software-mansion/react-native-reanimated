#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/easing/common.h>
#include <reanimated/CSS/util/algorithms.h>

#include <vector>

namespace reanimated::css {

class StepsEasing : public EasingBase<EasingType::Steps> {
 public:
  StepsEasing(std::vector<double> pointsX, std::vector<double> pointsY);

  double calculate(double x) const override;
  bool operator==(const EasingBase<EasingType::Steps> &other) const override;

 private:
  const std::vector<double> pointsX_;
  const std::vector<double> pointsY_;
};

std::shared_ptr<StepsEasing> steps(
    std::vector<double> pointsX,
    std::vector<double> pointsY);

} // namespace reanimated::css
