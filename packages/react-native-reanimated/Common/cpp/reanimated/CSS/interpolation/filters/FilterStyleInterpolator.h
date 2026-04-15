#pragma once

#include <reanimated/CSS/interpolation/filters/FilterOperation.h>
#include <reanimated/CSS/interpolation/operations/OperationsStyleInterpolator.h>

#include <memory>
#include <utility>

namespace reanimated::css {

class FilterStyleInterpolator final : public OperationsStyleInterpolatorBase<FilterOperation> {
 public:
  FilterStyleInterpolator(
      const PropertyPath &propertyPath,
      const std::shared_ptr<StyleOperationInterpolators> &interpolators,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

 protected:
  std::optional<std::pair<StyleOperations, StyleOperations>> createInterpolationPair(
      const StyleOperations &fromOperations,
      const StyleOperations &toOperations) const override;
};

} // namespace reanimated::css
