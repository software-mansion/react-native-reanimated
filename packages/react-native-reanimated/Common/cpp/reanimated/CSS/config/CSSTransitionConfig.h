#pragma once

#include <react/renderer/core/RawValue.h>

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/config/common.h>
#include <reanimated/CSS/easing/EasingFunctions.h>

#include <folly/dynamic.h>
#include <string>
#include <unordered_map>

namespace reanimated::css {

using namespace facebook::react;

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

std::optional<CSSTransitionPropertySettings> getTransitionPropertySettings(
    const CSSTransitionPropertiesSettings &propertiesSettings,
    const std::string &propName);

// TODO - remove this implementation when CSS refactor is finished
struct CSSTransitionConfigUpdates {
  std::optional<TransitionProperties> properties;
  std::optional<CSSTransitionPropertiesSettings> settings;
};

CSSTransitionConfig parseCSSTransitionConfig(
    jsi::Runtime &rt,
    const jsi::Value &config);

CSSTransitionConfigUpdates getParsedCSSTransitionConfigUpdates(
    jsi::Runtime &rt,
    const jsi::Value &partialConfig);

} // namespace reanimated::css
