#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/common.h>
#include <reanimated/CSS/easing/EasingFunctions.h>

#include <optional>
#include <string>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

struct CSSTransitionPropertySettings {
  double duration;
  EasingFunction easingFunction;
  double delay;
  bool allowDiscrete;
};

using CSSTransitionPropertiesSettings = std::unordered_map<std::string, CSSTransitionPropertySettings>;

using CSSTransitionPropertyUpdates = std::unordered_map<std::string, std::optional<std::pair<jsi::Value, jsi::Value>>>;

struct CSSTransitionConfig {
  CSSTransitionPropertyUpdates properties;
  CSSTransitionPropertiesSettings settings;
};

struct PartialCSSTransitionPropertySettings {
  std::optional<double> duration;
  std::optional<EasingFunction> easingFunction;
  std::optional<double> delay;
  std::optional<bool> allowDiscrete;
};

using CSSTransitionPropertySettingsUpdates = std::unordered_map<std::string, PartialCSSTransitionPropertySettings>;

struct CSSTransitionUpdates {
  CSSTransitionPropertyUpdates properties;
  std::optional<CSSTransitionPropertySettingsUpdates> settings;
};

std::optional<CSSTransitionPropertySettings> getTransitionPropertySettings(
    const CSSTransitionPropertiesSettings &propertiesSettings,
    const std::string &propName);

CSSTransitionConfig parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config);
CSSTransitionUpdates parseCSSTransitionUpdates(jsi::Runtime &rt, const jsi::Value &updates);

} // namespace reanimated::css
