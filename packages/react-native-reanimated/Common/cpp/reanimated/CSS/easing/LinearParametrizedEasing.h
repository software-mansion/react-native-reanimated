#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/util/algorithms.h>

#include <functional>
#include <vector>

double interpolateValue(
    double x,
    std::size_t leftIdx,
    const std::vector<double> &arrX,
    const std::vector<double> &arrY);

namespace reanimated {

EasingFunction createLinearEasingFunction(
    const std::vector<double> &arrX,
    const std::vector<double> &arrY);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
