#include <reanimated/CSS/interpolation/filters/FilterStyleInterpolator.h>

#include <algorithm>
#include <memory>
#include <optional>
#include <utility>

namespace reanimated::css {

const folly::dynamic defaultStyleValueDynamic = folly::dynamic::array();

FilterStyleInterpolator::FilterStyleInterpolator(
    const PropertyPath &propertyPath,
    const std::shared_ptr<StyleOperationInterpolators> &interpolators,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : OperationsStyleInterpolatorBase<FilterOperation>(
          propertyPath,
          interpolators,
          viewStylesRepository,
          defaultStyleValueDynamic) {}

std::optional<std::pair<StyleOperations, StyleOperations>> FilterStyleInterpolator::createInterpolationPair(
    const StyleOperations &fromOperations,
    const StyleOperations &toOperations) const {
  StyleOperations fromOperationsResult, toOperationsResult;
  size_t i = 0;

  size_t fromOperationsSize = fromOperations.size();
  size_t toOperationsSize = toOperations.size();
  size_t minSize = std::min(fromOperationsSize, toOperationsSize);

  for (; i < minSize; i++) {
    const auto &fromOperation = fromOperations[i];
    const auto &toOperation = toOperations[i];

    // Types don't match, we need to return nullopt as we cannot interpolate
    if (fromOperation->type != toOperation->type) {
      return std::nullopt;
    }

    fromOperationsResult.emplace_back(fromOperation);
    toOperationsResult.emplace_back(toOperation);
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

  return std::make_pair(fromOperationsResult, toOperationsResult);
}

} // namespace reanimated::css
