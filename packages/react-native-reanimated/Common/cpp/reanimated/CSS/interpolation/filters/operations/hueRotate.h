#pragma once

#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

#include <string>

namespace reanimated::css {

struct HueRotateOperation final : public FilterOperationBase<FilterOp::HueRotate, CSSAngle> {
  using FilterOperationBase<FilterOp::HueRotate, CSSAngle>::FilterOperationBase;

  explicit HueRotateOperation(double value) : FilterOperationBase<FilterOp::HueRotate, CSSAngle>(CSSAngle(value)) {}
};

} // namespace reanimated::css
