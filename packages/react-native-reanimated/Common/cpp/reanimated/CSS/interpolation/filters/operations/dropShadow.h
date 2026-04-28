#pragma once

#include <reanimated/CSS/common/values/complex/CSSDropShadow.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

#include <utility>

namespace reanimated::css {

struct DropShadowOperation final : public FilterOperationBase<FilterOp::DropShadow, CSSDropShadow> {
  using FilterOperationBase<FilterOp::DropShadow, CSSDropShadow>::FilterOperationBase;

  explicit DropShadowOperation(CSSDropShadow value)
      : FilterOperationBase<FilterOp::DropShadow, CSSDropShadow>(std::move(value)) {}
};

} // namespace reanimated::css
