#pragma once

#include <reanimated/CSS/utils/Algorithms.h>
#include <reanimated/CSS/utils/EasingFunction.h>

#include <functional>
#include <vector>

namespace reanimated {
EasingFunction createStepsEasingFunction(
    std::vector<double> arrX,
    std::vector<double> arrY);
} // namespace reanimated
