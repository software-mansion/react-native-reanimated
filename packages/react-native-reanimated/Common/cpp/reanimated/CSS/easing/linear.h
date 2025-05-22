#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/easing/common.h>
#include <reanimated/CSS/util/algorithms.h>

#include <memory>
#include <utility>
#include <vector>

namespace reanimated::css {

class LinearEasing : public EasingBase<EasingType::Linear> {
 public:
  LinearEasing(std::vector<double> pointsX, std::vector<double> pointsY);

  double calculate(double x) const override;
  bool operator==(const EasingBase<EasingType::Linear> &other) const override;

 private:
  const std::vector<double> pointsX_;
  const std::vector<double> pointsY_;

  double interpolateValue(double x, std::size_t leftIdx) const;
};

std::shared_ptr<LinearEasing> linear(
    std::vector<double> pointsX,
    std::vector<double> pointsY);

} // namespace reanimated::css
