#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/common.h>
#include <reanimated/CSS/easing/EasingFunctions.h>

#include <string>
#include <unordered_map>

namespace reanimated::css {

struct CSSTransitionPropertyUpdate {
  std::pair<folly::dynamic, folly::dynamic> value;
  double duration;
  double delay;
  EasingFunction easingFunction;
};

struct CSSTransitionConfig {
  std::unordered_map<std::string, CSSTransitionPropertyUpdate> updates;
  std::vector<std::string> removedProperties;
};

CSSTransitionConfig parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config);

CSSTransitionPropertySettings getTransitionPropertySettings(
    const CSSTransitionPropertiesSettings &propertiesSettings,
    const std::string &propName);

} // namespace reanimated::css
