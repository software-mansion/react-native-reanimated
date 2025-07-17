#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/config/PropertyInterpolatorsConfig.h>
#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>

namespace reanimated::css {

class TransitionStyleInterpolator {
 public:
  TransitionStyleInterpolator(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  std::unordered_set<std::string> getReversedPropertyNames(
      const folly::dynamic &newPropertyValues) const;

  folly::dynamic interpolate(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const TransitionProgressProvider &transitionProgressProvider) const;

  void discardFinishedInterpolators(
      const TransitionProgressProvider &transitionProgressProvider);
  void discardIrrelevantInterpolators(
      const std::unordered_set<std::string> &transitionPropertyNames);
  void updateInterpolatedProperties(
      const ChangedProps &changedProps,
      const folly::dynamic &lastUpdateValue);

 private:
  using MapInterpolatorsCallback = std::function<folly::dynamic(
      const std::shared_ptr<PropertyInterpolator> &,
      const std::shared_ptr<KeyframeProgressProvider> &)>;

  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  PropertyInterpolatorsRecord interpolators_;

  folly::dynamic mapInterpolators(
      const TransitionProgressProvider &transitionProgressProvider,
      const MapInterpolatorsCallback &callback) const;
};

} // namespace reanimated::css
