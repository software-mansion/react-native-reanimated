#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

namespace reanimated::css {

struct SepiaOperation final : public FilterOperationBase<FilterOp::Sepia, CSSDouble> {
  using FilterOperationBase<FilterOp::Sepia, CSSDouble>::FilterOperationBase;

  explicit SepiaOperation(double value) : FilterOperationBase<FilterOp::Sepia, CSSDouble>(CSSDouble(value)) {}
};

} // namespace reanimated::css
