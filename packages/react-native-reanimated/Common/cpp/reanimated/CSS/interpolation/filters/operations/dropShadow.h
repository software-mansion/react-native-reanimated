#pragma once

#include <reanimated/CSS/interpolation/filters/FilterOperation.h>
#include <reanimated/CSS/common/values/complex/CSSDropShadow.h>

#include <string>

namespace reanimated::css {
template <FilterOp TOperation>
struct DropShadowBase : public FilterOperationBase<TOperation, CSSDropShadow> {
  using FilterOperationBase<TOperation, CSSDropShadow>::FilterOperationBase;

  explicit DropShadowBase(const std::string &value);

  folly::dynamic valueToDynamic() const override;
};

using DropShadowOperation = DropShadowBase<FilterOp::dropShadow>;

} // namespace reanimated::css