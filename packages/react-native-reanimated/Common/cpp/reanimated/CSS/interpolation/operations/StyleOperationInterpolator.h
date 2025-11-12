#pragma once

#include <reanimated/CSS/interpolation/operations/StyleOperation.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <memory>
#include <unordered_map>

namespace reanimated::css {

template <typename TOperation>
concept ResolvableOp = requires(TOperation operation) {
  { operation.value } -> std::convertible_to<typename std::remove_reference_t<decltype(operation.value)>>;
  requires Resolvable<std::remove_reference_t<decltype(operation.value)>>;
}; // NOLINT(readability/braces)

class StyleOperationInterpolator {
 public:
  using Interpolators = std::unordered_map<size_t, std::shared_ptr<StyleOperationInterpolator>>;

  struct UpdateContext {
    const std::shared_ptr<const ShadowNode> &node;
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository;
    const std::shared_ptr<Interpolators> &interpolators;
  };

  virtual std::shared_ptr<StyleOperation> getDefaultOperation() const = 0;
  virtual std::unique_ptr<StyleOperation> interpolate(
      double progress,
      const std::shared_ptr<StyleOperation> &from,
      const std::shared_ptr<StyleOperation> &to,
      const UpdateContext &context) const = 0;
  virtual std::shared_ptr<StyleOperation> resolveOperation(
      const std::shared_ptr<StyleOperation> &operation,
      const UpdateContext &context) const;
};

using StyleOperationInterpolators = StyleOperationInterpolator::Interpolators;
using StyleOperationsInterpolationContext = StyleOperationInterpolator::UpdateContext;

} // namespace reanimated::css
