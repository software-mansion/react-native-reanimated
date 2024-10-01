#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

namespace reanimated {

enum AnimationDirection { normal, reverse, alternate, alternateReverse };

enum AnimationFillMode { none, forwards, backwards, both };

struct CSSAnimationConfig {
  jsi::Object keyframeStyle;
  double animationDuration;
  EasingFunction easingFunction;
  double animationDelay;
  double animationIterationCount;
  AnimationDirection animationDirection;
  AnimationFillMode animationFillMode;
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

inline EasingFunction getAnimationTimingFunction(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  const auto str = config.getProperty(rt, "animationTimingFunction");
  return getEasingFunction(rt, str);
}

inline double getAnimationDelay(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "animationDelay").asNumber();
}

inline double getAnimationIterationCount(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return config.getProperty(rt, "animationIterationCount").asNumber();
}

inline AnimationDirection getAnimationDirection(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  static const std::unordered_map<std::string, AnimationDirection>
      strToEnumMap = {
          {"normal", normal},
          {"reverse", reverse},
          {"alternate", alternate},
          {"alternate-reverse", alternateReverse}};

  const auto str =
      config.getProperty(rt, "animationDirection").asString(rt).utf8(rt);

  auto it = strToEnumMap.find(str);
  if (it != strToEnumMap.end()) {
    return it->second;
  } else {
    throw std::invalid_argument(
        "[Reanimated] Invalid string for CSSAnimationDirection enum: " + str);
  }
}

inline AnimationFillMode getAnimationFillMode(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  static const std::unordered_map<std::string, AnimationFillMode> strToEnumMap =
      {{"none", none},
       {"forwards", forwards},
       {"backwards", backwards},
       {"both", both}};

  const auto str =
      config.getProperty(rt, "animationFillMode").asString(rt).utf8(rt);

  auto it = strToEnumMap.find(str);
  if (it != strToEnumMap.end()) {
    return it->second;
  } else {
    throw std::invalid_argument("[Reanimated] Invalid fill mode: " + str);
  }
}

CSSAnimationConfig parseCSSAnimationConfig(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  const auto &configObj = config.asObject(rt);

  return {
      getAnimationKeyframeStyle(rt, configObj),
      getAnimationDuration(rt, configObj),
      getAnimationTimingFunction(rt, configObj),
      getAnimationDelay(rt, configObj),
      getAnimationIterationCount(rt, configObj),
      getAnimationDirection(rt, configObj),
      getAnimationFillMode(rt, configObj)};
}

} // namespace reanimated
