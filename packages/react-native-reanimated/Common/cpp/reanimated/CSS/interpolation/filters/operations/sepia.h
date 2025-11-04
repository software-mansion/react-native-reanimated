#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

#include <string>

namespace reanimated::css {
template <FilterOp TOperation>
struct SepiaOperationBase : public FilterOperationBase<TOperation, CSSDouble> {
  using FilterOperationBase<TOperation, CSSDouble>::FilterOperationBase;

  explicit SepiaOperationBase(const std::string &value);

  folly::dynamic valueToDynamic() const override;
};

using SepiaOperation = SepiaOperationBase<FilterOp::sepia>;

} // namespace reanimated::css
