#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <vector>

namespace reanimated {

size_t firstSmallerThanOrEqualBinsearch(
    double x,
    const std::vector<double> &arr);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
