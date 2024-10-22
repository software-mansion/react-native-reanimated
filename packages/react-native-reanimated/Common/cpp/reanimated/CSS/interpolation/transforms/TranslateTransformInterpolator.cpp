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
    const TransformInterpolatorUpdateContext &context) const {
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

  const auto from =
      resolveValue(fromValue, context.node, context.viewStylesRepository);
  const auto to =
      resolveValue(toValue, context.node, context.viewStylesRepository);

  if (!from.has_value() || !to.has_value()) {
    return progress < 0.5 ? fromOperation : toOperation;
  }
  return UnitValue(from.value() + (to.value() - from.value()) * progress);
}

template <typename OperationType>
OperationType
TranslateTransformInterpolatorBase<OperationType>::resolveOperation(
    const OperationType &operation,
    const ShadowNode::Shared &shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const {
  const auto resolvedValue =
      resolveValue(operation.value, shadowNode, viewStylesRepository);
  return OperationType(resolvedValue.value_or(0));
}

template <typename OperationType>
std::optional<double>
TranslateTransformInterpolatorBase<OperationType>::resolveValue(
    const UnitValue &value,
    const ShadowNode::Shared &shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const {
  return viewStylesRepository->resolveUnitValue(
      value, shadowNode, relativeTo_, relativeProperty_);
}

// Declare types for TranslateTransformInterpolator
template class TranslateTransformInterpolatorBase<TranslateXOperation>;
template class TranslateTransformInterpolatorBase<TranslateYOperation>;

} // namespace reanimated
