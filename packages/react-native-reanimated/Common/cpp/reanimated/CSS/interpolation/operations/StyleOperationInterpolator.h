#pragma once

#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/operations/StyleOperation.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>

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
      const UpdateContext &context,
      const std::shared_ptr<AnimatedPropsBuilder> &propsBuilder) const = 0;
  virtual std::shared_ptr<StyleOperation> resolveOperation(
      const std::shared_ptr<StyleOperation> &operation,
      const UpdateContext &context) const;
  virtual void addDiscreteStyleOperationToPropsBuilder(
      const std::shared_ptr<StyleOperation> &operation,
      const std::shared_ptr<AnimatedPropsBuilder> &propsBuilder) const;

 private:
  const std::shared_ptr<StyleOperation> defaultOperation_;
};

using StyleOperationInterpolators = StyleOperationInterpolator::Interpolators;
using StyleOperationsInterpolationContext = StyleOperationInterpolator::UpdateContext;

} // namespace reanimated::css
