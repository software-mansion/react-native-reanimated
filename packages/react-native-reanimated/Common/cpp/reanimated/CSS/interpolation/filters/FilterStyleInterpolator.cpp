#include <reanimated/CSS/interpolation/filters/FilterStyleInterpolator.h>
#include <reanimated/CSS/interpolation/filters/operations/contrast.h>

#include <algorithm>
#include <memory>
#include <tuple>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

std::tuple<FilterOperations, FilterOperations, bool> FilterStyleInterpolator::createFilterInterpolationPair(
    const FilterOperations &fromOperations,
    const FilterOperations &toOperations) const {
  FilterOperations fromOperationsResult, toOperationsResult;
  size_t i = 0;

  size_t fromOperationsSize = fromOperations.size();
  size_t toOperationsSize = toOperations.size();
  size_t minSize = std::min(fromOperationsSize, toOperationsSize);

  while (i < minSize) {
    const auto &fromOperation = fromOperations[i];
    const auto &toOperation = toOperations[i];

    // Types match directly
    if (fromOperation->type == toOperation->type) {
      fromOperationsResult.emplace_back(fromOperation);
      toOperationsResult.emplace_back(toOperation);
      i++;
    } else {
      // If the operation do not match, we need to set keyframe property isDiscrete to false
      return std::make_tuple(fromOperations, toOperations, true);
    }
  }

  // Add remaining operations with default values
  for (; i < fromOperations.size(); ++i) {
    fromOperationsResult.emplace_back(fromOperations[i]);
    toOperationsResult.emplace_back(getDefaultOperationOfType(fromOperations[i]->type));
  }
  for (; i < toOperations.size(); ++i) {
    fromOperationsResult.emplace_back(getDefaultOperationOfType(toOperations[i]->type));
    toOperationsResult.emplace_back(toOperations[i]);
  }

  return std::make_tuple(fromOperationsResult, toOperationsResult, false);
}

} // namespace reanimated::css
