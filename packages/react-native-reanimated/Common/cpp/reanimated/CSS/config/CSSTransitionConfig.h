#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/config/common.h>
#include <reanimated/CSS/easing/EasingFunctions.h>

#include <string>
#include <unordered_map>

namespace reanimated {

struct CSSTransitionPropertySettings {
  double duration;
  EasingFunction easingFunction;
  double delay;
  bool allowDiscrete;
};

using CSSTransitionPropertiesSettings =
    std::unordered_map<std::string, CSSTransitionPropertySettings>;

struct CSSTransitionConfig {
  TransitionProperties properties;
  CSSTransitionPropertiesSettings settings;
};

struct PartialCSSTransitionConfig {
  std::optional<TransitionProperties> properties;
  std::optional<CSSTransitionPropertiesSettings> settings;
};

std::optional<CSSTransitionPropertySettings> getTransitionPropertySettings(
    const CSSTransitionPropertiesSettings &propertiesSettings,
    const std::string &propName);

TransitionProperties getProperties(jsi::Runtime &rt, const jsi::Object &config);

CSSTransitionPropertiesSettings parseCSSTransitionPropertiesSettings(
    jsi::Runtime &rt,
    const jsi::Object &settings);

CSSTransitionConfig parseCSSTransitionConfig(
    jsi::Runtime &rt,
    const jsi::Value &config);

PartialCSSTransitionConfig parsePartialCSSTransitionConfig(
    jsi::Runtime &rt,
    const jsi::Value &partialConfig);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
