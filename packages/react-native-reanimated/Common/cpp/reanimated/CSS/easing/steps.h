#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/util/algorithms.h>

#include <vector>

namespace reanimated::css {

EasingFunction steps(
    const std::vector<double> &pointsX,
    const std::vector<double> &pointsY);

} // namespace reanimated::css
