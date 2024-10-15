#include <reanimated/CSS/interpolation/transforms/TranslateTransformInterpolator.h>

namespace reanimated {

template <typename OperationType>
TranslateTransformInterpolatorBase<OperationType>::
    TranslateTransformInterpolatorBase(
        RelativeTo relativeTo,
        const std::string &relativeProperty,
        const UnitValue &defaultValue)
    : TransformInterpolatorBase<OperationType>(
          std::make_shared<OperationType>(defaultValue)),
      relativeTo_(relativeTo),
      relativeProperty_(relativeProperty) {}

template <typename OperationType>
OperationType TranslateTransformInterpolatorBase<OperationType>::interpolate(
    const double progress,
    const OperationType &fromOperation,
    const OperationType &toOperation,
    const InterpolationUpdateContext &context) const {
  if (progress == 0) {
    return fromOperation;
  }
  if (progress == 1) {
    return toOperation;
  }
  const auto &fromValue = fromOperation.value;
  const auto &toValue = toOperation.value;
  // If both value types are the same, we can interpolate without reading the
  // relative value from the shadow node
  // (also, when one of the values is 0, and the other is relative)
  if ((fromValue.isRelative == toValue.isRelative) ||
      (fromValue.isRelative && toValue.value == 0) ||
      (toValue.isRelative && fromValue.value == 0)) {
    return UnitValue(
        fromValue.value + (toValue.value - fromValue.value) * progress,
        fromValue.isRelative || toValue.isRelative);
  }
  // TODO - add support for mixed relative and absolute values
  return fromOperation;
}

// Declare types for TranslateTransformInterpolator
template class TranslateTransformInterpolatorBase<TranslateXOperation>;
template class TranslateTransformInterpolatorBase<TranslateYOperation>;

} // namespace reanimated
