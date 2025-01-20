#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <algorithm>
#include <vector>

namespace reanimated {

size_t firstSmallerOrEqual(
    double x,
    const std::vector<double> &arr);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
