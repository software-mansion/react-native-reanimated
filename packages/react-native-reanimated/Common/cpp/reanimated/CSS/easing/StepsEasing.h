#pragma once

#include <reanimated/CSS/util/algorithms.h>
#include <reanimated/CSS/util/easingFunction.h>

#include <functional>
#include <vector>

namespace reanimated {
EasingFunction createStepsEasingFunction(
    std::vector<double> arrX,
    std::vector<double> arrY);
} // namespace reanimated
