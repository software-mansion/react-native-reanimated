#pragma once

#include <reanimated/CSS/common/filters/FilterOp.h>
#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>
#include <reanimated/CSS/interpolation/operations/StyleOperationInterpolator.h>

#include <memory>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

template <typename TOperation>
concept ResolvableFilterOp = requires(TOperation operation) {
  { operation.value } -> std::convertible_to<typename std::remove_reference_t<decltype(operation.value)>>;
  requires Resolvable<std::remove_reference_t<decltype(operation.value)>>;
}; // NOLINT(readability/braces)

using FilterOperationInterpolators = StyleOperationInterpolators;
using FilterInterpolationContext = StyleOperationsInterpolationContext;

template <typename TOperation>
class FilterOperationInterpolator : public StyleOperationInterpolatorBase<TOperation> {
 public:
  explicit FilterOperationInterpolator(const std::shared_ptr<TOperation> &defaultOperation);
};

template <ResolvableFilterOp TOperation>
class FilterOperationInterpolator<TOperation> : public StyleOperationInterpolatorBase<TOperation> {
 public:
  FilterOperationInterpolator(
      const std::shared_ptr<TOperation> &defaultOperation,
      ResolvableValueInterpolatorConfig config);
};

} // namespace reanimated::css
