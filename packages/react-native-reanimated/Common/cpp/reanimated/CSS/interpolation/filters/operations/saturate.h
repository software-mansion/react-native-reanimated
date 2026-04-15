#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

namespace reanimated::css {

struct SaturateOperation final : public FilterOperationBase<FilterOp::Saturate, CSSDouble> {
  using FilterOperationBase<FilterOp::Saturate, CSSDouble>::FilterOperationBase;

  explicit SaturateOperation(double value) : FilterOperationBase<FilterOp::Saturate, CSSDouble>(CSSDouble(value)) {}
};

} // namespace reanimated::css
