#include <reanimated/CSS/svg/interpolation/transforms/SVGTransformsInterpolator.h>

namespace reanimated::css {

folly::dynamic SVGTransformsInterpolator::convertResultToDynamic(
    const TransformOperations &operations) const {
  return MatrixOperation(operations).valueToDynamic();
}

TransformOperation SVGTransformsInterpolator::operationFrom(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return TransformOperationSVG::from(rt, value);
}

TransformOperation SVGTransformsInterpolator::operationFrom(
    const folly::dynamic &value) const {
  return TransformOperationSVG::from(value);
}

} // namespace reanimated::css
