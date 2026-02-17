#pragma once

#include <reanimated/CSS/InterpolatorRegistry.h>
#include <reanimated/CSS/common/definitions.h>
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
      const std::string &componentName,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  folly::dynamic interpolate(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const TransitionProgressProvider &transitionProgressProvider) const;

  bool createOrUpdateInterpolator(
      jsi::Runtime &rt,
      const std::string &propertyName,
      const jsi::Value &oldValue,
      const jsi::Value &newValue,
      const folly::dynamic &lastValue);
  void setAllowDiscrete(const std::string &propertyName, bool allowDiscrete);
  void removeProperty(const std::string &propertyName);
  void discardFinishedInterpolators(const TransitionProgressProvider &transitionProgressProvider);

 private:
  using MapInterpolatorsCallback = std::function<
      folly::dynamic(const std::shared_ptr<PropertyInterpolator> &, const std::shared_ptr<KeyframeProgressProvider> &)>;

  const std::string componentName_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  PropertyInterpolatorsRecord interpolators_;
  std::unordered_set<std::string> allowDiscreteProperties_;

  std::shared_ptr<PropertyInterpolator> getOrCreateInterpolator(const std::string &propertyName);
};

} // namespace reanimated::css
