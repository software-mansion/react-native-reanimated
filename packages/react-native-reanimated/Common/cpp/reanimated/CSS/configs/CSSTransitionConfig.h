#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

#include <folly/dynamic.h>
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

struct CSSTransitionDynamicPropertySettings {
  std::pair<folly::dynamic, folly::dynamic> value;
  double duration;
  EasingFunction easingFunction;
  double delay;
  bool allowDiscrete;
};

using CSSTransitionDynamicPropertiesSettings = std::unordered_map<std::string, CSSTransitionDynamicPropertySettings>;

struct CSSTransitionDynamicConfig {
  CSSTransitionDynamicPropertiesSettings changedProperties;
  std::vector<std::string> removedProperties;
};

CSSTransitionConfig parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config);
CSSTransitionDynamicConfig parseCSSTransitionConfig(const folly::dynamic &config);

} // namespace reanimated::css
