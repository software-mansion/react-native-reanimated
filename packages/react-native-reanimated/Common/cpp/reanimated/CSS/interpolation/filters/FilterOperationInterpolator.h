#pragma once

#include <reanimated/CSS/common/filters/FilterOp.h>
#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>
#include <reanimated/CSS/interpolation/operations/StyleOperationInterpolator.h>

#include <memory>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

using FilterOperationInterpolators = StyleOperationInterpolators;
using FilterInterpolationContext = StyleOperationsInterpolationContext;

template <typename TOperation>
class FilterOperationInterpolator final : public StyleOperationInterpolator {
 public:
  using StyleOperationInterpolator::StyleOperationInterpolator;

  std::unique_ptr<StyleOperation> interpolate(
      double progress,
      const std::shared_ptr<StyleOperation> &from,
      const std::shared_ptr<StyleOperation> &to,
      const FilterInterpolationContext &context) const override;
};

} // namespace reanimated::css
