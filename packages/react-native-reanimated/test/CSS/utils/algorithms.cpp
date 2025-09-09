#include <reanimated/CSS/utils/algorithms.h>

namespace reanimated::css {

size_t firstSmallerOrEqual(const double x, const std::vector<double> &arr) {
  auto it = std::upper_bound(arr.begin(), arr.end(), x);
  return it == arr.begin() ? 0 : std::distance(arr.begin(), --it);
}

} // namespace reanimated::css
