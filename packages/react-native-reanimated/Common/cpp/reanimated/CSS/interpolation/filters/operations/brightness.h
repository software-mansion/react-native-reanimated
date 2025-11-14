#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

namespace reanimated::css {

struct BrightnessOperation final : public FilterOperationBase<FilterOp::Brightness, CSSDouble> {
  using FilterOperationBase<FilterOp::Brightness, CSSDouble>::FilterOperationBase;

  explicit BrightnessOperation(double value) : FilterOperationBase<FilterOp::Brightness, CSSDouble>(CSSDouble(value)) {}
};

} // namespace reanimated::css
