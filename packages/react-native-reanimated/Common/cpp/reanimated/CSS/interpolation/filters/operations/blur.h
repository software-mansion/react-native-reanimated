#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

#include <string>

namespace reanimated::css {
template <FilterOp TOperation>
struct BlurOperationBase : public FilterOperationBase<TOperation, CSSDouble> {
  using FilterOperationBase<TOperation, CSSDouble>::FilterOperationBase;

  explicit BlurOperationBase(const std::string &value);

  folly::dynamic valueToDynamic() const override;
};

using BlurOperation = BlurOperationBase<FilterOp::blur>;

} // namespace reanimated::css
