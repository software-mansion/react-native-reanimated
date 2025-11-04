#include <reanimated/CSS/interpolation/filters/FilterOperationInterpolator.h>

#include <reanimated/CSS/interpolation/filters/operations/blur.h>
#include <reanimated/CSS/interpolation/filters/operations/brightness.h>
#include <reanimated/CSS/interpolation/filters/operations/contrast.h>
#include <reanimated/CSS/interpolation/filters/operations/dropshadow.h>
#include <reanimated/CSS/interpolation/filters/operations/grayscale.h>
#include <reanimated/CSS/interpolation/filters/operations/huerotate.h>
#include <reanimated/CSS/interpolation/filters/operations/invert.h>
#include <reanimated/CSS/interpolation/filters/operations/opacity.h>
#include <reanimated/CSS/interpolation/filters/operations/saturate.h>
#include <reanimated/CSS/interpolation/filters/operations/sepia.h>

#include <memory>
#include <utility>

#include <reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.h>

#include <reanimated/CSS/interpolation/transforms/operations/rotate.h>
#include <reanimated/CSS/interpolation/transforms/operations/scale.h>
#include <reanimated/CSS/interpolation/transforms/operations/skew.h>
#include <reanimated/CSS/interpolation/transforms/operations/translate.h>

#include <memory>
#include <utility>

namespace reanimated::css {

std::shared_ptr<FilterOperation> FilterInterpolator::resolveOperation(
    const std::shared_ptr<FilterOperation> &operation,
    const UpdateContext &context) const {
  return operation;
}

// Template implementations
template <typename TOperation>
FilterOperationInterpolator<TOperation>::FilterOperationInterpolator(
    const std::shared_ptr<TOperation> &defaultOperation)
    : FilterOperationInterpolatorBase<TOperation>(defaultOperation) {}

template <typename TOperation>
std::unique_ptr<FilterOperation> FilterOperationInterpolator<TOperation>::interpolate(
    double progress,
    const std::shared_ptr<FilterOperation> &from,
    const std::shared_ptr<FilterOperation> &to,
    const FilterInterpolationContext &context) const {
  const auto &fromOp = *std::static_pointer_cast<TOperation>(from);
  const auto &toOp = *std::static_pointer_cast<TOperation>(to);

  return std::make_unique<TOperation>(fromOp.value.interpolate(progress, toOp.value));
}

template <ResolvableFilterOp TOperation>
FilterOperationInterpolator<TOperation>::FilterOperationInterpolator(
    const std::shared_ptr<TOperation> &defaultOperation,
    ResolvableValueInterpolatorConfig config)
    : FilterOperationInterpolatorBase<TOperation>(defaultOperation), config_(std::move(config)) {}

template <ResolvableFilterOp TOperation>
std::unique_ptr<FilterOperation> FilterOperationInterpolator<TOperation>::interpolate(
    double progress,
    const std::shared_ptr<FilterOperation> &from,
    const std::shared_ptr<FilterOperation> &to,
    const FilterInterpolationContext &context) const {
  const auto &fromOp = *std::static_pointer_cast<TOperation>(from);
  const auto &toOp = *std::static_pointer_cast<TOperation>(to);

  return std::make_unique<TOperation>(
      fromOp.value.interpolate(progress, toOp.value, getResolvableValueContext(context)));
}

template <ResolvableFilterOp TOperation>
std::shared_ptr<FilterOperation> FilterOperationInterpolator<TOperation>::resolveOperation(
    const std::shared_ptr<FilterOperation> &operation,
    const FilterInterpolationContext &context) const {
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
ResolvableValueInterpolationContext FilterOperationInterpolator<TOperation>::getResolvableValueContext(
    const FilterInterpolationContext &context) const {
  return ResolvableValueInterpolationContext{
      .node = context.node,
      .viewStylesRepository = context.viewStylesRepository,
      .relativeProperty = config_.relativeProperty,
      .relativeTo = config_.relativeTo};
}

template class FilterOperationInterpolator<BlurOperation>;
template class FilterOperationInterpolator<BrightnessOperation>;
template class FilterOperationInterpolator<ContrastOperation>;
template class FilterOperationInterpolator<DropShadowOperation>;
template class FilterOperationInterpolator<GrayscaleOperation>;
template class FilterOperationInterpolator<HueRotateOperation>;
template class FilterOperationInterpolator<InvertOperation>;
template class FilterOperationInterpolator<OpacityOperation>;
template class FilterOperationInterpolator<SaturateOperation>;
template class FilterOperationInterpolator<SepiaOperation>;
} // namespace reanimated::css
