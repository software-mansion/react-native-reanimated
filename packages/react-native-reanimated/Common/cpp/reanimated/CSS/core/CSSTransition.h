#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <vector>

namespace reanimated::css {

class CSSTransition {
 public:
  CSSTransition(
      std::shared_ptr<const ShadowNode> shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  Tag getViewTag() const;
  std::shared_ptr<const ShadowNode> getShadowNode() const;
  double getMinDelay(double timestamp) const;
  TransitionProgressState getState() const;
  TransitionProperties getProperties() const;

  folly::dynamic run(
      jsi::Runtime &rt,
      const PropertyValueDiffsMap &propertiesDiffs,
      const folly::dynamic &lastUpdateValue,
      double timestamp);
  void updateConfig(
      const PropertiesSettingsMap &changedPropertiesSettings,
      const std::vector<std::string> &removedProperties);
  folly::dynamic update(double timestamp);

  // Preconfigured-trigger API. setConfig stores a CSSTransitionConfig under an
  // opaque int key (callers, e.g. pseudo selectors, decide what the key
  // represents). trigger(key, ...) plays the transition using the stored
  // config's per-property timing settings, with values supplied via valueChanges.
  void setConfig(int configKey, CSSTransitionConfig config);
  folly::dynamic trigger(
      int configKey,
      std::unordered_map<std::string, std::pair<folly::dynamic, folly::dynamic>> &&valueChanges,
      const folly::dynamic &lastUpdateValue,
      double timestamp);

 private:
  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  TransitionProperties transitionProperties_;
  TransitionStyleInterpolator styleInterpolator_;
  TransitionProgressProvider progressProvider_;
  std::unordered_map<int, CSSTransitionConfig> storedConfigs_;

  void handleChangedProperties(
      jsi::Runtime &rt,
      const PropertyValueDiffsMap &propertiesDiffs,
      const folly::dynamic &lastUpdateValue,
      double timestamp);
  void removeProperties(const std::vector<std::string> &propertyNames);
  void removeProperty(const std::string &propertyName);
};

} // namespace reanimated::css
