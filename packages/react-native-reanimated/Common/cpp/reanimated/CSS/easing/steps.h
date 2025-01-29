#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/util/algorithms.h>

#include <vector>

namespace reanimated {

EasingFunction steps(
    const std::vector<double> &pointsX,
    const std::vector<double> &pointsY);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
