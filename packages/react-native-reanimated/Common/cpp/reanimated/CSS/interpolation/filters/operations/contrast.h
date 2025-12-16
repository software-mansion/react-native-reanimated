#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

namespace reanimated::css {

struct ContrastOperation final : public FilterOperationBase<FilterOp::Contrast, CSSDouble> {
  using FilterOperationBase<FilterOp::Contrast, CSSDouble>::FilterOperationBase;

  explicit ContrastOperation(double value) : FilterOperationBase<FilterOp::Contrast, CSSDouble>(CSSDouble(value)) {}
};

} // namespace reanimated::css
