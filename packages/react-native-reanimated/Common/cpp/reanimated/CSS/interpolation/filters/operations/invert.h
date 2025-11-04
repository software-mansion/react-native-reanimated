#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

namespace reanimated::css {

struct InvertOperation final : public FilterOperationBase<FilterOp::Invert, CSSDouble> {
  using FilterOperationBase<FilterOp::Invert, CSSDouble>::FilterOperationBase;

  explicit InvertOperation(double value) : FilterOperationBase<FilterOp::Invert, CSSDouble>(CSSDouble(value)) {}
};

} // namespace reanimated::css
