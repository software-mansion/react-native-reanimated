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

  jsi::Value getCurrentInterpolationStyle(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const;

  jsi::Value update(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const std::unordered_map<std::string, TransitionPropertyProgressProvider>
          &progressProviders);

  void discardIrrelevantInterpolators(
      const std::unordered_set<std::string> &transitionPropertyNames);
  void updateInterpolatedProperties(
      jsi::Runtime &rt,
      const ChangedProps &changedProps);

 private:
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  PropertiesInterpolators interpolators_;
};

} // namespace reanimated
