#include <reanimated/CSS/interpolation/transforms/operations/skew.h>

#include <string>

namespace reanimated::css {

template <TransformOp TOperation>
SkewOperationBase<TOperation>::SkewOperationBase(const std::string &value)
    : TransformOperationBase<TOperation, CSSAngle>(CSSAngle(value)) {}

template <TransformOp TOperation>
folly::dynamic SkewOperationBase<TOperation>::valueToDynamic() const {
  return this->value.toDynamic();
}

template struct SkewOperationBase<TransformOp::SkewX>;
template struct SkewOperationBase<TransformOp::SkewY>;

} // namespace reanimated::css
