#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/config/PropertyInterpolatorsConfig.h>
#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>

namespace reanimated {

class TransitionStyleInterpolator {
 public:
  TransitionStyleInterpolator(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  jsi::Value getCurrentInterpolationStyle(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const;
  std::unordered_set<std::string> getReversedPropertyNames(
      jsi::Runtime &rt,
      const jsi::Value &newPropertyValues) const;

  jsi::Value update(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const std::unordered_set<std::string> &propertiesToRemove);

  void discardIrrelevantInterpolators(
      const std::unordered_set<std::string> &transitionPropertyNames);
  void updateInterpolatedProperties(
      jsi::Runtime &rt,
      const ChangedProps &changedProps,
      const TransitionPropertyProgressProviders &propertyProgressProviders);

 private:
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  PropertyInterpolatorsRecord interpolators_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
