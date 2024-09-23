#pragma once

#include <functional>
#include <vector>

#include <reanimated/CSS/utility/Algorithms.h>
#include <reanimated/CSS/utility/EasingFunction.h>

namespace reanimated {
EasingFunction createStepsEasingFunction(
    std::vector<double> arrX,
    std::vector<double> arrY);
} // namespace reanimated
