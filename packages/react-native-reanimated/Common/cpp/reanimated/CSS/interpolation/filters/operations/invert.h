#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

#include <string>

namespace reanimated::css {
template <FilterOp TOperation>
struct InvertOperationBase : public FilterOperationBase<TOperation, CSSDouble> {
  using FilterOperationBase<TOperation, CSSDouble>::FilterOperationBase;

  explicit InvertOperationBase(const std::string &value);

  folly::dynamic valueToDynamic() const override;
};

using InvertOperation = InvertOperationBase<FilterOp::invert>;

} // namespace reanimated::css
