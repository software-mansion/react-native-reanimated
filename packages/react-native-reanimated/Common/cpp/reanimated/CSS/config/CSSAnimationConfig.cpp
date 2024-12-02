#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/config/CSSAnimationConfig.h>

namespace reanimated {

jsi::Value getKeyframesStyle(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "keyframesStyle");
}

KeyframeEasingFunctions getKeyframeTimingFunctions(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  KeyframeEasingFunctions result;
  const auto &keyframeTimingFunctions =
      config.getProperty(rt, "keyframeTimingFunctions").asObject(rt);
  const auto timingFunctionOffsets =
      keyframeTimingFunctions.getPropertyNames(rt);
  const auto timingFunctionsCount = timingFunctionOffsets.size(rt);

  for (size_t i = 0; i < timingFunctionsCount; ++i) {
    const auto offset =
        timingFunctionOffsets.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto easingFunction = getEasingFunction(
        rt, keyframeTimingFunctions.getProperty(rt, offset.c_str()));

    result[std::stod(offset)] = easingFunction;
  }

  return result;
}

double getIterationCount(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "iterationCount").asNumber();
}

AnimationDirection getDirection(jsi::Runtime &rt, const jsi::Object &config) {
  static const std::unordered_map<std::string, AnimationDirection>
      strToEnumMap = {
          {"normal", AnimationDirection::Normal},
          {"reverse", AnimationDirection::Reverse},
          {"alternate", AnimationDirection::Alternate},
          {"alternateReverse", AnimationDirection::AlternateReverse}};

  const auto str = config.getProperty(rt, "direction").asString(rt).utf8(rt);
  auto it = strToEnumMap.find(str);
  if (it == strToEnumMap.cend()) {
    throw std::invalid_argument(
        "[Reanimated] Invalid animationDirection: " + str);
  }
  return it->second;
}

AnimationFillMode getFillMode(jsi::Runtime &rt, const jsi::Object &config) {
  static const std::unordered_map<std::string, AnimationFillMode> strToEnumMap =
      {{"none", AnimationFillMode::None},
       {"forwards", AnimationFillMode::Forwards},
       {"backwards", AnimationFillMode::Backwards},
       {"both", AnimationFillMode::Both}};

  const auto str = config.getProperty(rt, "fillMode").asString(rt).utf8(rt);
  auto it = strToEnumMap.find(str);
  if (it == strToEnumMap.cend()) {
    throw std::invalid_argument(
        "[Reanimated] Invalid animationFillMode: " + str);
  }
  return it->second;
}

AnimationPlayState getPlayState(jsi::Runtime &rt, const jsi::Object &config) {
  static const std::unordered_map<std::string, AnimationPlayState>
      strToEnumMap = {
          {"running", AnimationPlayState::Running},
          {"paused", AnimationPlayState::Paused}};

  const auto str = config.getProperty(rt, "playState").asString(rt).utf8(rt);
  auto it = strToEnumMap.find(str);
  if (it == strToEnumMap.cend()) {
    throw std::invalid_argument(
        "[Reanimated] Invalid animationPlayState: " + str);
  }
  return it->second;
}

CSSAnimationConfig parseCSSAnimationConfig(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  const auto &configObj = config.asObject(rt);

  return {
      getKeyframesStyle(rt, configObj),
      getKeyframeTimingFunctions(rt, configObj),
      getDuration(rt, configObj),
      getTimingFunction(rt, configObj),
      getDelay(rt, configObj),
      getIterationCount(rt, configObj),
      getDirection(rt, configObj),
      getFillMode(rt, configObj),
      getPlayState(rt, configObj)};
}

PartialCSSAnimationSettings parsePartialCSSAnimationSettings(
    jsi::Runtime &rt,
    const jsi::Value &partialSettings) {
  const auto &partialObj = partialSettings.asObject(rt);

  PartialCSSAnimationSettings result;

  if (partialObj.hasProperty(rt, "duration")) {
    result.duration = getDuration(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "timingFunction")) {
    result.easingFunction = getTimingFunction(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "delay")) {
    result.delay = getDelay(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "iterationCount")) {
    result.iterationCount = getIterationCount(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "direction")) {
    result.direction = getDirection(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "fillMode")) {
    result.fillMode = getFillMode(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "playState")) {
    result.playState = getPlayState(rt, partialObj);
  }

  return result;
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
