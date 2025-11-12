#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

namespace reanimated::css {

struct GrayscaleOperation final : public FilterOperationBase<FilterOp::Grayscale, CSSDouble> {
  using FilterOperationBase<FilterOp::Grayscale, CSSDouble>::FilterOperationBase;

  explicit GrayscaleOperation(double value) : FilterOperationBase<FilterOp::Grayscale, CSSDouble>(CSSDouble(value)) {}
};

} // namespace reanimated::css
