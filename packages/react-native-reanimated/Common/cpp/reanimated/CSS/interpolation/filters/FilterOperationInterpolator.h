#pragma once

#include <reanimated/CSS/common/filters/FilterOp.h>
#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>
#include <reanimated/CSS/interpolation/operations/StyleOperationInterpolator.h>

#include <memory>

namespace reanimated::css {

template <typename TOperation>
class FilterOperationInterpolator final : public StyleOperationInterpolator {
 public:
  using StyleOperationInterpolator::StyleOperationInterpolator;

  std::unique_ptr<StyleOperation> interpolate(
      double progress,
      const std::shared_ptr<StyleOperation> &from,
      const std::shared_ptr<StyleOperation> &to,
      const StyleOperationsInterpolationContext &context) const override;
};

} // namespace reanimated::css
