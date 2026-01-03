#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/common.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/utils/props.h>

#include <string>
#include <unordered_map>

namespace reanimated::css {

struct CSSTransitionPropertySettings {
  double duration;
  EasingFunction easingFunction;
  double delay;
  bool allowDiscrete;
};

using CSSTransitionPropertiesSettings = std::unordered_map<std::string, CSSTransitionPropertySettings>;

struct CSSTransitionConfig {
  TransitionProperties properties;
  CSSTransitionPropertiesSettings settings;
};

std::optional<CSSTransitionPropertySettings> getTransitionPropertySettings(
    const CSSTransitionPropertiesSettings &propertiesSettings,
    const std::string &propName);

TransitionProperties getProperties(jsi::Runtime &rt, const jsi::Object &config);

std::optional<CSSTransitionPropertiesSettings> parseCSSTransitionPropertiesSettings(
    jsi::Runtime &rt,
    const jsi::Value &settings);

CSSTransitionConfig parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config);

ChangedProps parseChangedPropsFromDiff(const folly::dynamic &diff);

} // namespace reanimated::css
