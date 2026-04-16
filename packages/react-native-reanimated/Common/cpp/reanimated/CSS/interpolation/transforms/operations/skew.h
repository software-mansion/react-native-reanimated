#pragma once

#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <string>

namespace reanimated::css {

template <TransformOp TOperation>
struct SkewOperationBase : public TransformOperationBase<TOperation, CSSAngle> {
  using TransformOperationBase<TOperation, CSSAngle>::TransformOperationBase;

  explicit SkewOperationBase(const std::string &value);
};

using SkewXOperation = SkewOperationBase<TransformOp::SkewX>;
using SkewYOperation = SkewOperationBase<TransformOp::SkewY>;

} // namespace reanimated::css
