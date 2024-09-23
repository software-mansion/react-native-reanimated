#include <reanimated/CSS/utility/Algorithms.h>

namespace reanimated {
size_t firstSmallerThanOrEqualBinsearch(double x, std::vector<double> arr) {
  size_t left = 0;
  size_t right = arr.size() - 1;
  // Binsearch to find the first progress coordinate smaller or equal than the x
  // argument
  while (left < right) {
    std::size_t pivot = (left + right + 1) / 2;
    if (arr[pivot] == x) {
      left = right = pivot;
    } else if (arr[pivot] < x) {
      left = pivot;
    } else if (arr[pivot] > x) {
      right = pivot - 1;
    }
  }
  return left;
}

} // namespace reanimated
