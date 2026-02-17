#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/common.h>
#include <reanimated/CSS/easing/EasingFunctions.h>

#include <jsi/jsi.h>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

struct CSSTransitionPropertySettings {
  std::pair<jsi::Value, jsi::Value> value;
  double duration;
  EasingFunction easingFunction;
  double delay;
  bool allowDiscrete;
};

using CSSTransitionPropertiesSettings = std::unordered_map<std::string, CSSTransitionPropertySettings>;

struct CSSTransitionConfig {
  CSSTransitionPropertiesSettings changedProperties;
  std::vector<std::string> removedProperties;
};

CSSTransitionConfig parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config);

} // namespace reanimated::css
