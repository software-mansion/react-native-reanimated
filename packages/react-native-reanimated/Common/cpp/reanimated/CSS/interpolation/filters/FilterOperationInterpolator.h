#pragma once

#include <reanimated/CSS/common/filters/FilterOp.h>
#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

#include <reanimated/CSS/common/filters/FilterOp.h>
#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/common/values/complex/CSSDropShadow.h>

#include <reanimated/CSS/interpolation/filters/operations/blur.h>
#include <reanimated/CSS/interpolation/filters/operations/brightness.h>
#include <reanimated/CSS/interpolation/filters/operations/contrast.h>
#include <reanimated/CSS/interpolation/filters/operations/dropShadow.h>
#include <reanimated/CSS/interpolation/filters/operations/grayscale.h>
#include <reanimated/CSS/interpolation/filters/operations/hueRotate.h>
#include <reanimated/CSS/interpolation/filters/operations/invert.h>
#include <reanimated/CSS/interpolation/filters/operations/opacity.h>
#include <reanimated/CSS/interpolation/filters/operations/saturate.h>
#include <reanimated/CSS/interpolation/filters/operations/sepia.h>

#include <memory>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

template <typename TOperation>
concept ResolvableFilterOp = requires(TOperation operation) {
  { operation.value } -> std::convertible_to<typename std::remove_reference_t<decltype(operation.value)>>;
  requires Resolvable<std::remove_reference_t<decltype(operation.value)>>;
}; // NOLINT(readability/braces)

class FilterInterpolator {
 public:
  using Interpolators = std::unordered_map<FilterOp, std::shared_ptr<FilterInterpolator>>;

  struct UpdateContext {
    const std::shared_ptr<const ShadowNode> &node;
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository;
    const std::shared_ptr<Interpolators> &interpolators;
  };

  virtual ~FilterInterpolator() = default;

  virtual std::shared_ptr<FilterOperation> getDefaultOperation() const = 0;
  virtual std::unique_ptr<FilterOperation> interpolate(
      double progress,
      const std::shared_ptr<FilterOperation> &from,
      const std::shared_ptr<FilterOperation> &to,
      const UpdateContext &context) const = 0;
  virtual std::shared_ptr<FilterOperation> resolveOperation(
      const std::shared_ptr<FilterOperation> &operation,
      const UpdateContext &context) const;
};

using FilterOperationInterpolators = FilterInterpolator::Interpolators;
using FilterInterpolationContext = FilterInterpolator::UpdateContext;

// Base class with common functionality
template <typename TOperation>
class FilterOperationInterpolatorBase : public FilterInterpolator {
 public:
  explicit FilterOperationInterpolatorBase(std::shared_ptr<TOperation> defaultOperation)
      : defaultOperation_(std::move(defaultOperation)) {}

  std::shared_ptr<FilterOperation> getDefaultOperation() const override {
    return defaultOperation_;
  }

 protected:
  std::shared_ptr<TOperation> defaultOperation_;
};

// Base implementation for simple operations
template <typename TOperation>
class FilterOperationInterpolator : public FilterOperationInterpolatorBase<TOperation> {
 public:
  explicit FilterOperationInterpolator(const std::shared_ptr<TOperation> &defaultOperation);

  std::unique_ptr<FilterOperation> interpolate(
      double progress,
      const std::shared_ptr<FilterOperation> &from,
      const std::shared_ptr<FilterOperation> &to,
      const FilterInterpolationContext &context) const override;
};

// Specialization for resolvable operations
template <ResolvableFilterOp TOperation>
class FilterOperationInterpolator<TOperation> : public FilterOperationInterpolatorBase<TOperation> {
 public:
  FilterOperationInterpolator(
      const std::shared_ptr<TOperation> &defaultOperation,
      ResolvableValueInterpolatorConfig config);

  std::unique_ptr<FilterOperation> interpolate(
      double progress,
      const std::shared_ptr<FilterOperation> &from,
      const std::shared_ptr<FilterOperation> &to,
      const FilterInterpolationContext &context) const override;

  std::shared_ptr<FilterOperation> resolveOperation(
      const std::shared_ptr<FilterOperation> &operation,
      const FilterInterpolationContext &context) const override;

 protected:
  const ResolvableValueInterpolatorConfig config_;

  ResolvableValueInterpolationContext getResolvableValueContext(const FilterInterpolationContext &context) const;
};

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
