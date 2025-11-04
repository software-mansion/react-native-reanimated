#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

#include <string>

namespace reanimated::css {
template <FilterOp TOperation>
struct ContrastOperationBase : public FilterOperationBase<TOperation, CSSDouble> {
  using FilterOperationBase<TOperation, CSSDouble>::FilterOperationBase;

  explicit ContrastOperationBase(const std::string &value);

  folly::dynamic valueToDynamic() const override;
};

using ContrastOperation = ContrastOperationBase<FilterOp::contrast>;

} // namespace reanimated::css
