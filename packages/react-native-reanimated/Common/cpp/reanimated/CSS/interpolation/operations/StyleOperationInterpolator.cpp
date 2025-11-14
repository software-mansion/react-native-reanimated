#include <reanimated/CSS/interpolation/operations/StyleOperationInterpolator.h>

namespace reanimated::css {

StyleOperationInterpolator::StyleOperationInterpolator(const std::shared_ptr<StyleOperation> &defaultOperation)
    : defaultOperation_(defaultOperation) {}

std::shared_ptr<StyleOperation> StyleOperationInterpolator::getDefaultOperation() const {
  return defaultOperation_;
}

std::shared_ptr<StyleOperation> StyleOperationInterpolator::resolveOperation(
    const std::shared_ptr<StyleOperation> &operation,
    const StyleOperationsInterpolationContext &context) const {
  return operation;
}

// Template implementations
template <typename TOperation>
StyleOperationInterpolatorBase<TOperation>::StyleOperationInterpolatorBase(
    const std::shared_ptr<TOperation> &defaultOperation)
    : StyleOperationInterpolator(defaultOperation) {}

template <typename TOperation>
std::unique_ptr<StyleOperation> StyleOperationInterpolatorBase<TOperation>::interpolate(
    double progress,
    const std::shared_ptr<StyleOperation> &from,
    const std::shared_ptr<StyleOperation> &to,
    const StyleOperationsInterpolationContext &context) const {
  const auto &fromOp = *std::static_pointer_cast<TOperation>(from);
  const auto &toOp = *std::static_pointer_cast<TOperation>(to);

  return std::make_unique<TOperation>(fromOp.value.interpolate(progress, toOp.value));
}

template <ResolvableOp TOperation>
StyleOperationInterpolatorBase<TOperation>::StyleOperationInterpolatorBase(
    const std::shared_ptr<TOperation> &defaultOperation,
    ResolvableValueInterpolatorConfig config)
    : StyleOperationInterpolator(defaultOperation), config_(std::move(config)) {}

template <ResolvableOp TOperation>
std::unique_ptr<StyleOperation> StyleOperationInterpolatorBase<TOperation>::interpolate(
    double progress,
    const std::shared_ptr<StyleOperation> &from,
    const std::shared_ptr<StyleOperation> &to,
    const StyleOperationsInterpolationContext &context) const {
  const auto &fromOp = *std::static_pointer_cast<TOperation>(from);
  const auto &toOp = *std::static_pointer_cast<TOperation>(to);

  return std::make_unique<TOperation>(
      fromOp.value.interpolate(progress, toOp.value, getResolvableValueContext(context)));
}

template <ResolvableOp TOperation>
std::shared_ptr<StyleOperation> StyleOperationInterpolatorBase<TOperation>::resolveOperation(
    const std::shared_ptr<StyleOperation> &operation,
    const StyleOperationsInterpolationContext &context) const {
  const auto &resolvableOp = std::static_pointer_cast<TOperation>(operation);
  const auto &resolved = resolvableOp->value.resolve(getResolvableValueContext(context));

  if (!resolved.has_value()) {
    throw std::invalid_argument(
        "[Reanimated] Cannot resolve resolvable operation: " + operation->getOperationName() +
        " for node with tag: " + std::to_string(context.node->getTag()));
  }

  return std::make_shared<TOperation>(resolved.value());
}

template <ResolvableFilterOp TOperation>
ResolvableValueInterpolationContext StyleOperationInterpolatorBase<TOperation>::getResolvableValueContext(
    const StyleOperationsInterpolationContext &context) const {
  return ResolvableValueInterpolationContext{
      .node = context.node,
      .viewStylesRepository = context.viewStylesRepository,
      .relativeProperty = config_.relativeProperty,
      .relativeTo = config_.relativeTo}; // TODO - add missing fallbackInterpolateThreshold
}

template class StyleOperationInterpolatorBase<BlurOperation>;
template class StyleOperationInterpolatorBase<BrightnessOperation>;
template class StyleOperationInterpolatorBase<ContrastOperation>;
template class StyleOperationInterpolatorBase<DropShadowOperation>;
template class StyleOperationInterpolatorBase<GrayscaleOperation>;
template class StyleOperationInterpolatorBase<HueRotateOperation>;
template class StyleOperationInterpolatorBase<InvertOperation>;
template class StyleOperationInterpolatorBase<OpacityOperation>;
template class StyleOperationInterpolatorBase<SaturateOperation>;
template class StyleOperationInterpolatorBase<SepiaOperation>;

} // namespace reanimated::css
