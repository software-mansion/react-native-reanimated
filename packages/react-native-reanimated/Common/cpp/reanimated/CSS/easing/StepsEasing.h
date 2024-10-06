#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/util/algorithms.h>

#include <functional>
#include <vector>

namespace reanimated {

EasingFunction createStepsEasingFunction(
    std::vector<double> arrX,
    std::vector<double> arrY);

} // namespace reanimated
