#include <reanimated/CSS/interpolation/transforms/TranslateTransformInterpolator.h>

namespace reanimated {

template <typename OperationType>
TranslateTransformInterpolator<OperationType>::TranslateTransformInterpolator(
    const RelativeTo relativeTo,
    const std::string &relativeProperty,
    const UnitValue &defaultValue)
    : TransformInterpolatorBase<OperationType>(
          std::make_shared<OperationType>(defaultValue)),
      relativeTo_(relativeTo),
      relativeProperty_(relativeProperty) {}

template <typename OperationType>
OperationType TranslateTransformInterpolator<OperationType>::interpolate(
    const double progress,
    const OperationType &fromOperation,
    const OperationType &toOperation,
    const TransformInterpolatorUpdateContext &context) const {
  return OperationType(fromOperation.value.interpolate(
      progress,
      toOperation.value,
      {
          .node = context.node,
          .viewStylesRepository = context.viewStylesRepository,
          .relativeProperty = relativeProperty_,
          .relativeTo = relativeTo_,
      }));
}

template <typename OperationType>
OperationType TranslateTransformInterpolator<OperationType>::resolveOperation(
    const OperationType &operation,
    const ShadowNode::Shared &shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const {
  const auto resolvedValue = operation.value.resolve({
      .node = shadowNode,
      .viewStylesRepository = viewStylesRepository,
      .relativeProperty = relativeProperty_,
      .relativeTo = relativeTo_,
  });
  return OperationType(UnitValue(resolvedValue.value_or(0)));
}

// Declare types for translate transform interpolators
template class TranslateTransformInterpolator<TranslateXOperation>;
template class TranslateTransformInterpolator<TranslateYOperation>;

} // namespace reanimated
