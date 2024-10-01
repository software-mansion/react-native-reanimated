#pragma once

#include <jsi/jsi.h>
#include <string>

using namespace facebook;

namespace reanimated {

struct CSSAnimationConfig {
  jsi::Object keyframeStyle;
  double animationDuration;
  jsi::Value animationTimingFunction;
  double animationDelay;
  double animationIterationCount;
  std::string animationDirection;
  std::string animationFillMode;
};

inline jsi::Object getAnimationKeyframeStyle(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return config.getProperty(rt, "animationName").asObject(rt);
}

inline double getAnimationDuration(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return config.getProperty(rt, "animationDuration").asNumber();
}

inline jsi::Value getAnimationTimingFunction(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return config.getProperty(rt, "animationTimingFunction");
}

inline double getAnimationDelay(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "animationDelay").asNumber();
}

inline double getAnimationIterationCount(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return config.getProperty(rt, "animationIterationCount").asNumber();
}

inline std::string getAnimationDirection(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return config.getProperty(rt, "animationDirection").asString(rt).utf8(rt);
}

inline std::string getAnimationFillMode(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return config.getProperty(rt, "animationFillMode").asString(rt).utf8(rt);
}

CSSAnimationConfig parseCSSAnimationConfig(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  const auto &configObj = config.asObject(rt);

  return {
      std::move(getAnimationKeyframeStyle(rt, configObj)),
      getAnimationDuration(rt, configObj),
      std::move(getAnimationTimingFunction(rt, configObj)),
      getAnimationDelay(rt, configObj),
      getAnimationIterationCount(rt, configObj),
      getAnimationDirection(rt, configObj),
      getAnimationFillMode(rt, configObj)};
}

} // namespace reanimated
