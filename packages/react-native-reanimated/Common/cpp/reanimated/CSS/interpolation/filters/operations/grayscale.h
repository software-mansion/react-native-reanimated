#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

#include <string>

namespace reanimated::css {
template <FilterOp TOperation>
struct GrayscaleOperationBase : public FilterOperationBase<TOperation, CSSDouble> {
  using FilterOperationBase<TOperation, CSSDouble>::FilterOperationBase;

  explicit GrayscaleOperationBase(const std::string &value);

  folly::dynamic valueToDynamic() const override;
};

using GrayscaleOperation = GrayscaleOperationBase<FilterOp::grayscale>;

} // namespace reanimated::css
