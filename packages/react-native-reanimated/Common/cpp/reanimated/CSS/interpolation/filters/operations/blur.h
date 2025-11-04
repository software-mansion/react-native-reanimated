#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

namespace reanimated::css {

struct BlurOperation final : public FilterOperationBase<FilterOp::Blur, CSSDouble> {
  using FilterOperationBase<FilterOp::Blur, CSSDouble>::FilterOperationBase;

  explicit BlurOperation(double value) : FilterOperationBase<FilterOp::Blur, CSSDouble>(CSSDouble(value)) {}
};

} // namespace reanimated::css
