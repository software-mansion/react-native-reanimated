#pragma once

#include <reanimated/CSS/configs/common.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

struct CSSTransitionPropertySettings {
  double duration;
  EasingConfig easingConfig;
  double delay;
  bool allowDiscrete;
};

using PropertyValueDiff = std::pair<jsi::Value, jsi::Value>;
/** TODO: unify folly::dynamic and jsi::value versions */
using PropertyValueDynamicDiff = std::pair<folly::dynamic, folly::dynamic>;

using PropertyValueDiffsMap = std::unordered_map<std::string, PropertyValueDiff>;
/** TODO: unify folly::dynamic and jsi::value versions */
using PropertyValueDynamicDiffsMap = std::unordered_map<std::string, PropertyValueDynamicDiff>;

using PropertiesSettingsMap = std::unordered_map<std::string, CSSTransitionPropertySettings>;

struct CSSTransitionConfig {
  PropertiesSettingsMap changedPropertiesSettings;
  PropertyValueDiffsMap changedProperties;
  std::vector<std::string> removedProperties;

  bool hasSettingsUpdates() const {
    return !changedPropertiesSettings.empty() || !removedProperties.empty();
  }
  bool hasValueUpdates() const {
    return !changedProperties.empty();
  }
  bool empty() const {
    return !hasSettingsUpdates() && !hasValueUpdates();
  }
};

CSSTransitionConfig
parseCSSTransitionConfig(jsi::Runtime &rt, const std::string &componentName, const jsi::Value &config);

} // namespace reanimated::css
