#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/config/StyleInterpolatorsConfig.h>
#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>

namespace reanimated {

class TransitionStyleInterpolator {
 public:
  TransitionStyleInterpolator(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  jsi::Value getCurrentStyle(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const TransitionProperties &properties) const;
  jsi::Value getCurrentInterpolationStyle(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const;

  jsi::Value update(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const std::unordered_map<std::string, TransitionPropertyProgressProvider>
          &progressProviders);

  void updateProperties(jsi::Runtime &rt, const ChangedProps &changedProps);

 private:
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  PropertiesInterpolators interpolators_;

  jsi::Value getAllPropsStyle(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const;
  jsi::Value getSpecificPropsStyle(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const PropertyNames &propertyNames) const;
};

} // namespace reanimated
