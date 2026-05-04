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

using CSSTransitionPropertiesDiffs = std::unordered_map<std::string, PropertyValueDiff>;

using CSSTransitionPropertiesSettings = std::unordered_map<std::string, CSSTransitionPropertySettings>;

struct CSSTransitionConfig {
  CSSTransitionPropertiesSettings changedPropertiesSettings;
  CSSTransitionPropertiesDiffs changedProperties;
  std::vector<std::string> removedProperties;
};

CSSTransitionConfig parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config);

} // namespace reanimated::css
