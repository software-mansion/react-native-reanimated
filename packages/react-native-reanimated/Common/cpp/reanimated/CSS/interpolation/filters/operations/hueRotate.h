#pragma once

#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

#include <string>

namespace reanimated::css {

template <FilterOp TOperation>
struct HueRotateOperationBase : public FilterOperationBase<TOperation, CSSAngle> {
  using FilterOperationBase<TOperation, CSSAngle>::FilterOperationBase;

  explicit HueRotateOperationBase(const std::string &value);

  folly::dynamic valueToDynamic() const override;
};

using HueRotateOperation = HueRotateOperationBase<FilterOp::hueRotate>;

} // namespace reanimated::css