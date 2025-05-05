#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/config/common.h>
#include <reanimated/CSS/easing/EasingFunctions.h>

#include <folly/dynamic.h>
#include <string>
#include <unordered_map>

namespace reanimated::css {

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

struct CSSTransitionConfigUpdates {
  std::optional<TransitionProperties> properties;
  std::optional<CSSTransitionPropertiesSettings> settings;
};

std::optional<CSSTransitionPropertySettings> getTransitionPropertySettings(
    const CSSTransitionPropertiesSettings &propertiesSettings,
    const std::string &propName);

CSSTransitionConfig parseCSSTransitionConfig(const folly::dynamic &config);

std::optional<CSSTransitionConfigUpdates> getParsedCSSTransitionConfigUpdates(
    const folly::dynamic &oldConfig,
    const folly::dynamic &newConfig);

// TODO - remove this implementation when CSS refactor is finished
CSSTransitionConfigUpdates getParsedCSSTransitionConfigUpdates(
    const folly::dynamic &partialConfig);

} // namespace reanimated::css
