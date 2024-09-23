#pragma once

#include <functional>
#include <vector>

#include <reanimated/CSS/utility/Algorithms.h>
#include <reanimated/CSS/utility/EasingFunction.h>

double interpolateValue(
    double x,
    std::size_t leftIdx,
    std::vector<double> arrX,
    std::vector<double> arrY);

namespace reanimated {

EasingFunction createLinearEasingFunction(
    std::vector<double> arrX,
    std::vector<double> arrY);

} // namespace reanimated
