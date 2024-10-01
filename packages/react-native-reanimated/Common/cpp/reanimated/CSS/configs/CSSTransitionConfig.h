#pragma once

#include <jsi/jsi.h>
#include <string>

using namespace facebook;
namespace reanimated {

struct CSSTransitionConfig {
  jsi::Array transitionProperty;
  double transitionDuration;
  jsi::Value transitionTimingFunction;
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

inline jsi::Value getTransitionTimingFunction(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return config.getProperty(rt, "transitionTimingFunction");
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
