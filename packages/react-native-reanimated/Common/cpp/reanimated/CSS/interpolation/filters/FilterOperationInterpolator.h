#pragma once
#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>

#include <reanimated/CSS/common/filters/FilterOp.h>
#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>
#include <reanimated/CSS/interpolation/operations/StyleOperationInterpolator.h>

#include <memory>

namespace reanimated::css {

template <typename TOperation>
class FilterOperationInterpolator final : public StyleOperationInterpolator {
 public:
  using StyleOperationInterpolator::StyleOperationInterpolator;

  FilterOperationInterpolator(
      const std::shared_ptr<TOperation> &defaultOperation,
      std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, TOperation &)> addToPropsBuilder);

  std::unique_ptr<StyleOperation> interpolate(
      double progress,
      const std::shared_ptr<StyleOperation> &from,
      const std::shared_ptr<StyleOperation> &to,
      const StyleOperationsInterpolationContext &context,
      const std::shared_ptr<AnimatedPropsBuilder> &propsBuilder) const override;

  void addDiscreteStyleOperationToPropsBuilder(
      const std::shared_ptr<StyleOperation> &operation,
      const std::shared_ptr<AnimatedPropsBuilder> &propsBuilder) const override;

 private:
  std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, TOperation &)> addToPropsBuilder_;
};

} // namespace reanimated::css
