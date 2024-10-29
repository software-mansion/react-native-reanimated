#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/util/algorithms.h>

#include <functional>
#include <vector>

namespace reanimated {

EasingFunction createStepsEasingFunction(
    const std::vector<double> &arrX,
    const std::vector<double> &arrY);

} // namespace reanimated
