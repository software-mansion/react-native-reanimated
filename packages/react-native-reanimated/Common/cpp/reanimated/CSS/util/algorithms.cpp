#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/util/algorithms.h>

namespace reanimated {

size_t firstSmallerOrEqual(const double x, const std::vector<double> &arr) {
  auto it = std::upper_bound(arr.begin(), arr.end(), x);
  return it == arr.begin() ? 0 : std::distance(arr.begin(), --it);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
