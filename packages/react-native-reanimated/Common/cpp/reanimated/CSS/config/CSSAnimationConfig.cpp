#include <reanimated/CSS/config/CSSAnimationConfig.h>

namespace reanimated {

inline jsi::Value getAnimationKeyframeStyle(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return config.getProperty(rt, "animationName");
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
          {"normal", AnimationDirection::NORMAL},
          {"reverse", AnimationDirection::REVERSE},
          {"alternate", AnimationDirection::ALTERNATE},
          {"alternateReverse", AnimationDirection::ALTERNATE_REVERSE}};

  const auto str =
      config.getProperty(rt, "animationDirection").asString(rt).utf8(rt);
  auto it = strToEnumMap.find(str);
  if (it == strToEnumMap.cend()) {
    throw std::invalid_argument(
        "[Reanimated] Invalid string for CSSAnimationDirection enum: " + str);
  }
  return it->second;
}

inline AnimationFillMode getAnimationFillMode(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  static const std::unordered_map<std::string, AnimationFillMode> strToEnumMap =
      {{"none", AnimationFillMode::NONE},
       {"forwards", AnimationFillMode::FORWARDS},
       {"backwards", AnimationFillMode::BACKWARDS},
       {"both", AnimationFillMode::BOTH}};

  const auto str =
      config.getProperty(rt, "animationFillMode").asString(rt).utf8(rt);
  auto it = strToEnumMap.find(str);
  if (it == strToEnumMap.cend()) {
    throw std::invalid_argument(
        "[Reanimated] Invalid string for CSSAnimationFillMode enum: " + str);
  }
  return it->second;
}

inline AnimationPlayState getAnimationPlayState(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  static const std::unordered_map<std::string, AnimationPlayState>
      strToEnumMap = {
          {"running", AnimationPlayState::RUNNING},
          {"paused", AnimationPlayState::PAUSED}};

  const auto str =
      config.getProperty(rt, "animationPlayState").asString(rt).utf8(rt);
  auto it = strToEnumMap.find(str);
  if (it == strToEnumMap.cend()) {
    throw std::invalid_argument(
        "[Reanimated] Invalid string for CSSAnimationPlayState enum: " + str);
  }
  return it->second;
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
      getAnimationFillMode(rt, configObj),
      getAnimationPlayState(rt, configObj)};
}

PartialCSSAnimationSettings parsePartialCSSAnimationSettings(
    jsi::Runtime &rt,
    const jsi::Value &partialSettings) {
  const auto &partialObj = partialSettings.asObject(rt);

  PartialCSSAnimationSettings result;

  if (partialObj.hasProperty(rt, "animationDuration")) {
    result.duration = getAnimationDuration(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "animationTimingFunction")) {
    result.easingFunction = getAnimationTimingFunction(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "animationDelay")) {
    result.delay = getAnimationDelay(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "animationIterationCount")) {
    result.iterationCount = getAnimationIterationCount(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "animationDirection")) {
    result.direction = getAnimationDirection(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "animationFillMode")) {
    result.fillMode = getAnimationFillMode(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "animationPlayState")) {
    result.playState = getAnimationPlayState(rt, partialObj);
  }

  return result;
}

} // namespace reanimated
