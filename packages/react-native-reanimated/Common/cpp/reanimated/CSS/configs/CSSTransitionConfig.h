#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

#include <jsi/jsi.h>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

struct CSSTransitionPropertySettings {
  double duration;
  EasingFunction easingFunction;
  double delay;
  bool allowDiscrete;
};

using PropertyValueDiff = std::pair<jsi::Value, jsi::Value>;

using PropertyValueDiffsMap = std::unordered_map<std::string, PropertyValueDiff>;

using PropertiesSettingsMap = std::unordered_map<std::string, CSSTransitionPropertySettings>;

struct CSSTransitionConfig {
  PropertiesSettingsMap changedPropertiesSettings;
  PropertyValueDiffsMap changedProperties;
  std::vector<std::string> removedProperties;
};

struct PseudoTransitionConfig {
  double duration;
  double delay;
  EasingFunction easingFn;
  bool allowDiscrete;
};

CSSTransitionConfig parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config);

PseudoTransitionConfig parsePseudoTransitionConfig(jsi::Runtime &rt, const jsi::Value &transition);

} // namespace reanimated::css
