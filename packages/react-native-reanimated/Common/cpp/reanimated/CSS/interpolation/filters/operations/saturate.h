#pragma once

#include <reanimated/CSS/interpolation/filters/FilterOperation.h>
#include <reanimated/CSS/common/values/CSSNumber.h>

#include <string>

namespace reanimated::css {

template <FilterOp TOperation>
struct SaturateOperationBase : public FilterOperationBase<TOperation, CSSDouble> {
  using FilterOperationBase<TOperation, CSSDouble>::FilterOperationBase;

  explicit SaturateOperationBase(const std::string &value);

  folly::dynamic valueToDynamic() const override;
};

using SaturateOperation = SaturateOperationBase<FilterOp::saturate>;

} // namespace reanimated::css
