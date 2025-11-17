#pragma once

#include <reanimated/CSS/interpolation/filters/FilterOperationInterpolator.h>
#include <reanimated/CSS/interpolation/operations/OperationsStyleInterpolator.h>

#include <memory>

namespace reanimated::css {

class FilterStyleInterpolator final : public OperationsStyleInterpolatorBase<FilterOperation> {
 public:
  FilterStyleInterpolator(
      const PropertyPath &propertyPath,
      const std::shared_ptr<StyleOperationInterpolators> &interpolators,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

 protected:
  std::optional<std::pair<FilterOperations, FilterOperations>> createInterpolationPair(
      const FilterOperations &fromOperations,
      const FilterOperations &toOperations) const override;
};

} // namespace reanimated::css
