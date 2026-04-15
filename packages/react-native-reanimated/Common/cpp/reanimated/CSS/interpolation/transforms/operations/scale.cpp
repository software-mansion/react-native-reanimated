#include <reanimated/CSS/interpolation/transforms/operations/scale.h>

#include <memory>

namespace reanimated::css {

template <TransformOp TOperation>
ScaleOperationBase<TOperation>::ScaleOperationBase(const double value)
    : TransformOperationBase<TOperation, CSSDouble>(CSSDouble(value)) {}

bool ScaleOperation::canConvertTo(TransformOp type) const {
  return type == TransformOp::ScaleX || type == TransformOp::ScaleY;
}

TransformOperations ScaleOperation::convertTo(TransformOp type) const {
  assertCanConvertTo(type);
  if (type == TransformOp::ScaleX) {
    return {std::make_shared<ScaleXOperation>(value), std::make_shared<ScaleYOperation>(value)};
  } else {
    return {std::make_shared<ScaleYOperation>(value), std::make_shared<ScaleXOperation>(value)};
  }
}

template struct ScaleOperationBase<TransformOp::ScaleX>;
template struct ScaleOperationBase<TransformOp::ScaleY>;
template struct ScaleOperationBase<TransformOp::Scale>;

} // namespace reanimated::css
