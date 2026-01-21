#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/common.h>
#include <reanimated/CSS/easing/EasingFunctions.h>

#include <folly/dynamic.h>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>

namespace reanimated::css {

struct CSSTransitionPropertySettings {
  std::pair<folly::dynamic, folly::dynamic> value;
  double duration;
  EasingFunction easingFunction;
  double delay;
  bool allowDiscrete;
};

using CSSTransitionPropertiesSettings = std::unordered_map<std::string, CSSTransitionPropertySettings>;
using RemovedProperties = std::unordered_set<std::string>;

struct CSSTransitionConfig {
  CSSTransitionPropertiesSettings changedProperties;
  RemovedProperties removedProperties;
};

std::optional<CSSTransitionPropertySettings> getTransitionPropertySettings(
    const CSSTransitionPropertiesSettings &propertiesSettings,
    const std::string &propName);

CSSTransitionConfig parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config);

} // namespace reanimated::css
