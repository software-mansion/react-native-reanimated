#pragma once

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

struct PseudoTransitionConfig {
  double duration;
  double delay;
  EasingFunction easingFn;
  bool allowDiscrete;
};

CSSTransitionConfig parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config);

PseudoTransitionConfig parsePseudoTransitionConfig(jsi::Runtime &rt, const jsi::Value &transition);

} // namespace reanimated::css
