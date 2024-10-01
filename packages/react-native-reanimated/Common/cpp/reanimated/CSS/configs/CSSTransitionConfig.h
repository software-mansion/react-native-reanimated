#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

namespace reanimated {

struct CSSTransitionConfig {
  jsi::Array transitionProperty;
  double transitionDuration;
  EasingFunction easingFunction;
  double transitionDelay;
};

inline jsi::Array getTransitionProperty(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return config.getProperty(rt, "transitionProperty").asObject(rt).asArray(rt);
}

inline double getTransitionDuration(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return config.getProperty(rt, "transitionDuration").asNumber();
}

inline EasingFunction getTransitionTimingFunction(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  const auto str = config.getProperty(rt, "animationTimingFunction");
  return getEasingFunction(rt, str);
}

inline double getTransitionDelay(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "transitionDelay").asNumber();
}

CSSTransitionConfig parseCSSTransitionConfig(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  const auto &configObj = config.asObject(rt);

  return CSSTransitionConfig{
      getTransitionProperty(rt, configObj),
      getTransitionDuration(rt, configObj),
      getTransitionTimingFunction(rt, configObj),
      getTransitionDelay(rt, configObj)};
}

} // namespace reanimated
