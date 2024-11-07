#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/util/algorithms.h>

#include <functional>
#include <vector>

double interpolateValue(
    double x,
    std::size_t leftIdx,
    const std::vector<double> &arrX,
    const std::vector<double> &arrY);

namespace reanimated {

EasingFunction createLinearEasingFunction(
    const std::vector<double> &arrX,
    const std::vector<double> &arrY);

} // namespace reanimated
