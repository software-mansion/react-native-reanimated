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

  std::unordered_set<std::string> getReversedPropertyNames(
      jsi::Runtime &rt,
      const jsi::Value &newPropertyValues) const;
  jsi::Value getCurrentInterpolationStyle(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const TransitionProgressProvider &transitionProgressProvider) const;

  jsi::Value interpolate(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const TransitionProgressProvider &transitionProgressProvider) const;

  void discardFinishedInterpolators(
      const TransitionProgressProvider &transitionProgressProvider);
  void discardIrrelevantInterpolators(
      const std::unordered_set<std::string> &transitionPropertyNames);
  void updateInterpolatedProperties(
      jsi::Runtime &rt,
      const ChangedProps &changedProps,
      const jsi::Value &lastUpdateValue);

 private:
  using MapInterpolatorsCallback = std::function<jsi::Value(
      const std::shared_ptr<PropertyInterpolator> &,
      const std::shared_ptr<KeyframeProgressProvider> &)>;

  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  PropertyInterpolatorsRecord interpolators_;

  jsi::Value mapInterpolators(
      jsi::Runtime &rt,
      const TransitionProgressProvider &transitionProgressProvider,
      const MapInterpolatorsCallback &callback) const;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
