#pragma once

#include <functional>
#include <vector>

#include <reanimated/CSS/Algorithms.h>
#include <reanimated/CSS/EasingFunction.h>

namespace reanimated {
EasingFunction createStepsEasingFunction(
    std::vector<double> arrX,
    std::vector<double> arrY);
} // namespace reanimated
