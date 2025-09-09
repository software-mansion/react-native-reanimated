#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/utils/algorithms.h>

#include <vector>

namespace reanimated::css {

double interpolateValue(
    double x,
    std::size_t leftIdx,
    const std::vector<double> &arrX,
    const std::vector<double> &arrY);

EasingFunction linear(
    const std::vector<double> &pointsX,
    const std::vector<double> &pointsY);

} // namespace reanimated::css
