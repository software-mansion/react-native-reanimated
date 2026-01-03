#pragma once

#include <reanimated/CSS/common/values/CSSValue.h>
#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/operations/StyleOperation.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <memory>
#include <unordered_map>

namespace reanimated::css {

class StyleOperationInterpolator {
 public:
  using Interpolators = std::unordered_map<size_t, std::shared_ptr<StyleOperationInterpolator>>;

  struct UpdateContext {
    const std::shared_ptr<const ShadowNode> &node;
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository;
    const std::shared_ptr<Interpolators> &interpolators;
    const double fallbackInterpolateThreshold;
  };

  explicit StyleOperationInterpolator(const std::shared_ptr<StyleOperation> &defaultOperation);
  virtual ~StyleOperationInterpolator() = default;

  std::shared_ptr<StyleOperation> getDefaultOperation() const;
  virtual std::unique_ptr<StyleOperation> interpolate(
      double progress,
      const std::shared_ptr<StyleOperation> &from,
      const std::shared_ptr<StyleOperation> &to,
      const UpdateContext &context) const = 0;
  virtual std::shared_ptr<StyleOperation> resolveOperation(
      const std::shared_ptr<StyleOperation> &operation,
      const UpdateContext &context) const;

 private:
  const std::shared_ptr<StyleOperation> defaultOperation_;
};

// Template base class that provides common functionality for specific operation types
template <typename TOperation>
class StyleOperationInterpolatorBase : public StyleOperationInterpolator {
 public:
  explicit StyleOperationInterpolatorBase(const std::shared_ptr<TOperation> &defaultOperation)
      : StyleOperationInterpolator(std::static_pointer_cast<StyleOperation>(defaultOperation)) {}

  std::unique_ptr<StyleOperation> interpolate(
      double progress,
      const std::shared_ptr<StyleOperation> &from,
      const std::shared_ptr<StyleOperation> &to,
      const UpdateContext &context) const override {
    // Cast to the specific operation type
    const auto &fromOp = std::static_pointer_cast<TOperation>(from);
    const auto &toOp = std::static_pointer_cast<TOperation>(to);
    return interpolateTyped(progress, fromOp, toOp, context);
  }

  std::shared_ptr<StyleOperation> resolveOperation(
      const std::shared_ptr<StyleOperation> &operation,
      const UpdateContext &context) const override {
    const auto &typedOp = std::static_pointer_cast<TOperation>(operation);
    return resolveTypedOperation(typedOp, context);
  }

 protected:
  // Virtual methods that derived classes can override for specific behavior
  virtual std::unique_ptr<StyleOperation> interpolateTyped(
      double progress,
      const std::shared_ptr<TOperation> &from,
      const std::shared_ptr<TOperation> &to,
      const UpdateContext &context) const = 0;

  virtual std::shared_ptr<StyleOperation> resolveTypedOperation(
      const std::shared_ptr<TOperation> &operation,
      const UpdateContext & /* context */) const {
    // Default implementation just returns the operation unchanged
    return operation;
  }
};

// Template base class for resolvable operations
template <typename TOperation>
class ResolvableOperationInterpolatorBase : public StyleOperationInterpolatorBase<TOperation> {
 public:
  ResolvableOperationInterpolatorBase(
      const std::shared_ptr<TOperation> &defaultOperation,
      ResolvableValueInterpolatorConfig config)
      : StyleOperationInterpolatorBase<TOperation>(defaultOperation), config_(std::move(config)) {}

 protected:
  const ResolvableValueInterpolatorConfig config_;

  ResolvableValueInterpolationContext getResolvableValueContext(
      const typename StyleOperationInterpolator::UpdateContext &context) const {
    return ResolvableValueInterpolationContext{
        .node = context.node,
        .fallbackInterpolateThreshold = context.fallbackInterpolateThreshold,
        .viewStylesRepository = context.viewStylesRepository,
        .relativeProperty = config_.relativeProperty,
        .relativeTo = config_.relativeTo};
  }
};

using StyleOperationInterpolators = StyleOperationInterpolator::Interpolators;
using StyleOperationsInterpolationContext = StyleOperationInterpolator::UpdateContext;

} // namespace reanimated::css
