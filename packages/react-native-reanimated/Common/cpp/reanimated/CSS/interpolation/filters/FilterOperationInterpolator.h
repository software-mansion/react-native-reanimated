#pragma once

#include <reanimated/CSS/common/filters/FilterOp.h>
#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>
#include <reanimated/CSS/interpolation/operations/StyleOperationInterpolator.h>

#include <memory>

namespace reanimated::css {

template <typename TOperation>
class FilterOperationInterpolator final : public StyleOperationInterpolatorBase<FilterOperation> {
 public:
  explicit FilterOperationInterpolator(const std::shared_ptr<FilterOperation> &defaultOperation)
      : StyleOperationInterpolatorBase<FilterOperation>(defaultOperation) {}

  std::unique_ptr<StyleOperation> interpolateTyped(
      double progress,
      const std::shared_ptr<FilterOperation> &from,
      const std::shared_ptr<FilterOperation> &to,
      const UpdateContext &context) const override;
};

} // namespace reanimated::css
