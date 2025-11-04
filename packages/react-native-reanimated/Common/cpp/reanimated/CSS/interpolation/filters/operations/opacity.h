#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

#include <string>

namespace reanimated::css {
template <FilterOp TOperation>
struct OpacityOperationBase : public FilterOperationBase<TOperation, CSSDouble> {
  using FilterOperationBase<TOperation, CSSDouble>::FilterOperationBase;

  explicit OpacityOperationBase(const std::string &value);

  folly::dynamic valueToDynamic() const override;
};

using OpacityOperation = OpacityOperationBase<FilterOp::opacity>;

} // namespace reanimated::css
