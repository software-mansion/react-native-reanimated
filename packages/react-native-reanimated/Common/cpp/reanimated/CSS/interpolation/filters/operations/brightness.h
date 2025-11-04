#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

#include <string>

namespace reanimated::css {
template <FilterOp TOperation>
struct BrightnessOperationBase : public FilterOperationBase<TOperation, CSSDouble> {
  using FilterOperationBase<TOperation, CSSDouble>::FilterOperationBase;

  explicit BrightnessOperationBase(const std::string &value);

  folly::dynamic valueToDynamic() const override;
};

using BrightnessOperation = BrightnessOperationBase<FilterOp::brightness>;

} // namespace reanimated::css
