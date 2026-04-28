#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

namespace reanimated::css {

struct OpacityOperation final : public FilterOperationBase<FilterOp::Opacity, CSSDouble> {
  using FilterOperationBase<FilterOp::Opacity, CSSDouble>::FilterOperationBase;

  explicit OpacityOperation(double value) : FilterOperationBase<FilterOp::Opacity, CSSDouble>(CSSDouble(value)) {}
};

} // namespace reanimated::css
