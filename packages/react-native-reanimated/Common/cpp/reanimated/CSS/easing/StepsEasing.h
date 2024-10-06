#pragma once

#include <reanimated/CSS/util/Algorithms.h>
#include <reanimated/CSS/util/EasingFunction.h>

#include <functional>
#include <vector>

namespace reanimated {
EasingFunction createStepsEasingFunction(
    std::vector<double> arrX,
    std::vector<double> arrY);
} // namespace reanimated
