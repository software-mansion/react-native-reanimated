#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

namespace reanimated::css {

template <TransformOp TOperation>
struct ScaleOperationBase : public TransformOperationBase<TOperation, CSSDouble> {
  using TransformOperationBase<TOperation, CSSDouble>::TransformOperationBase;

  explicit ScaleOperationBase(const double value);
};

using ScaleXOperation = ScaleOperationBase<TransformOp::ScaleX>;
using ScaleYOperation = ScaleOperationBase<TransformOp::ScaleY>;

struct ScaleOperation final : public ScaleOperationBase<TransformOp::Scale> {
  using ScaleOperationBase<TransformOp::Scale>::ScaleOperationBase;

  bool canConvertTo(TransformOp type) const override;
  TransformOperations convertTo(TransformOp type) const override;
};

} // namespace reanimated::css
