#pragma once

#include <reanimated/CSS/common/filters/FilterOp.h>
#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

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
      : defaultOperation_(defaultOperation) {}

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

} // namespace reanimated::css
