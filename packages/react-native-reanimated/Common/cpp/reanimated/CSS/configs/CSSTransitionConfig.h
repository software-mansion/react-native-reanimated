#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/common.h>
#include <reanimated/CSS/easing/EasingFunctions.h>

#include <optional>
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

struct PartialCSSTransitionConfig {
  std::optional<TransitionProperties> properties;
  std::optional<CSSTransitionPropertiesSettings> settings;
};

struct PartialCSSTransitionPropertySettings {
  std::optional<double> duration;
  std::optional<EasingFunction> easingFunction;
  std::optional<double> delay;
  std::optional<bool> allowDiscrete;
};

using CSSTransitionPropertySettingsUpdates =
    std::unordered_map<std::string, PartialCSSTransitionPropertySettings>;

using CSSTransitionPropertyDiffs =
    std::unordered_map<std::string, std::pair<jsi::Value, jsi::Value>>;

struct CSSTransitionUpdates {
  std::optional<CSSTransitionPropertyDiffs> properties;
  std::optional<CSSTransitionPropertySettingsUpdates> settings;
};

std::optional<CSSTransitionPropertySettings> getTransitionPropertySettings(
    const CSSTransitionPropertiesSettings &propertiesSettings,
    const std::string &propName);

TransitionProperties getProperties(jsi::Runtime &rt, const jsi::Object &config);

CSSTransitionPropertiesSettings parseCSSTransitionPropertiesSettings(jsi::Runtime &rt, const jsi::Object &settings);

CSSTransitionConfig parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config);

PartialCSSTransitionConfig parsePartialCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &partialConfig);

CSSTransitionUpdates parseCSSTransitionUpdates(jsi::Runtime &rt, const jsi::Value &updates);

} // namespace reanimated::css
