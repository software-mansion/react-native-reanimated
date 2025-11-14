#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

namespace reanimated::css {

struct HueRotateOperation final : public FilterOperationBase<FilterOp::HueRotate, CSSDouble> {
  using FilterOperationBase<FilterOp::HueRotate, CSSDouble>::FilterOperationBase;

  explicit HueRotateOperation(double value) : FilterOperationBase<FilterOp::HueRotate, CSSDouble>(CSSDouble(value)) {}
};

} // namespace reanimated::css
