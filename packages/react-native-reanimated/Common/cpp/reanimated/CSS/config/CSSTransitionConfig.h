#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

namespace reanimated {

struct CSSTransitionConfig {
  std::vector<std::string> properties;
  double duration;
  EasingFunction easingFunction;
  double delay;
};

struct PartialCSSTransitionSettings {
  std::optional<std::vector<std::string>> properties;
  std::optional<double> duration;
  std::optional<EasingFunction> easingFunction;
  std::optional<double> delay;
};

inline std::vector<std::string> getTransitionProperty(
    jsi::Runtime &rt,
    const jsi::Object &config);

inline double getTransitionDuration(
    jsi::Runtime &rt,
    const jsi::Object &config);

inline EasingFunction getTransitionTimingFunction(
    jsi::Runtime &rt,
    const jsi::Object &config);

inline double getTransitionDelay(jsi::Runtime &rt, const jsi::Object &config);

CSSTransitionConfig parseCSSTransitionConfig(
    jsi::Runtime &rt,
    const jsi::Value &config);

PartialCSSTransitionSettings parsePartialCSSTransitionSettings(
    jsi::Runtime &rt,
    const jsi::Value &config);

} // namespace reanimated
