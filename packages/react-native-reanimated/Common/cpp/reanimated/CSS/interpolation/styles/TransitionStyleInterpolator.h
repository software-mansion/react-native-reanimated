#pragma once

#include <reanimated/CSS/InterpolatorRegistry.h>
#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>

#include <cstdint>
#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated::css {

class TransitionStyleInterpolator {
 public:
  TransitionStyleInterpolator(
      const std::string &componentName,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  std::unordered_set<std::string> getReversedPropertyNames(const folly::dynamic &newPropertyValues) const;

  folly::dynamic interpolate(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const TransitionProgressProvider &transitionProgressProvider) const;

  void discardFinishedInterpolators(const TransitionProgressProvider &transitionProgressProvider);
  void discardIrrelevantInterpolators(const std::unordered_set<std::string> &transitionPropertyNames);
  std::vector<TransitionPropertyUpdate> updateInterpolatedProperties(
      jsi::Runtime &rt,
      const CSSTransitionPropertyUpdates &propertyUpdates,
      const jsi::Value &lastUpdates,
      const CSSTransitionPropertiesSettings &settings);

 private:
  bool isAllowedProperty(const std::string &propertyName, const CSSTransitionPropertiesSettings &settings) const;

  using MapInterpolatorsCallback = std::function<
      folly::dynamic(const std::shared_ptr<PropertyInterpolator> &, const std::shared_ptr<KeyframeProgressProvider> &)>;

  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  const InterpolatorFactoriesRecord &interpolatorFactories_;
  PropertyInterpolatorsRecord interpolators_;
};

} // namespace reanimated::css
