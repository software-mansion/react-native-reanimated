#include <reanimated/CSS/configs/CSSAnimationConfig.h>

namespace reanimated::css {

double getIterationCount(jsi::Runtime &rt, const jsi::Object &settings) {
  return settings.getProperty(rt, "iterationCount").asNumber();
}

AnimationDirection getDirection(jsi::Runtime &rt, const jsi::Object &settings) {
  static const std::unordered_map<std::string, AnimationDirection>
      strToEnumMap = {
          {"normal", AnimationDirection::Normal},
          {"reverse", AnimationDirection::Reverse},
          {"alternate", AnimationDirection::Alternate},
          {"alternate-reverse", AnimationDirection::AlternateReverse}};

  const auto str = settings.getProperty(rt, "direction").asString(rt).utf8(rt);
  auto it = strToEnumMap.find(str);
  if (it == strToEnumMap.cend()) {
    throw std::invalid_argument(
        "[Reanimated] Invalid animationDirection: " + str);
  }
  return it->second;
}

AnimationFillMode getFillMode(jsi::Runtime &rt, const jsi::Object &settings) {
  static const std::unordered_map<std::string, AnimationFillMode> strToEnumMap =
      {{"none", AnimationFillMode::None},
       {"forwards", AnimationFillMode::Forwards},
       {"backwards", AnimationFillMode::Backwards},
       {"both", AnimationFillMode::Both}};

  const auto str = settings.getProperty(rt, "fillMode").asString(rt).utf8(rt);
  auto it = strToEnumMap.find(str);
  if (it == strToEnumMap.cend()) {
    throw std::invalid_argument(
        "[Reanimated] Invalid animationFillMode: " + str);
  }
  return it->second;
}

AnimationPlayState getPlayState(jsi::Runtime &rt, const jsi::Object &settings) {
  static const std::unordered_map<std::string, AnimationPlayState>
      strToEnumMap = {
          {"running", AnimationPlayState::Running},
          {"paused", AnimationPlayState::Paused}};

  const auto str = settings.getProperty(rt, "playState").asString(rt).utf8(rt);
  auto it = strToEnumMap.find(str);
  if (it == strToEnumMap.cend()) {
    throw std::invalid_argument(
        "[Reanimated] Invalid animationPlayState: " + str);
  }
  return it->second;
}

CSSAnimationSettings parseCSSAnimationSettings(
    jsi::Runtime &rt,
    const jsi::Value &settings) {
  const auto &settingsObj = settings.asObject(rt);

  return {
      getDuration(rt, settingsObj),
      getTimingFunction(rt, settingsObj),
      getDelay(rt, settingsObj),
      getIterationCount(rt, settingsObj),
      getDirection(rt, settingsObj),
      getFillMode(rt, settingsObj),
      getPlayState(rt, settingsObj)};
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

std::vector<std::string> parseAnimationNames(
    jsi::Runtime &rt,
    const jsi::Value &animationNames) {
  std::vector<std::string> result;

  const auto &namesArray = animationNames.asObject(rt).asArray(rt);
  const auto animationNamesCount = namesArray.size(rt);
  result.reserve(animationNamesCount);

  for (size_t i = 0; i < animationNamesCount; i++) {
    result.emplace_back(
        namesArray.getValueAtIndex(rt, i).asString(rt).utf8(rt));
  }

  return result;
}

template <typename TResult>
std::unordered_map<size_t, TResult> parseHelper(
    jsi::Runtime &rt,
    const jsi::Object &settingsObj,
    std::function<TResult(jsi::Runtime &, const jsi::Value &)> parseFunction) {
  std::unordered_map<size_t, TResult> result;

  const auto animationIndices = settingsObj.getPropertyNames(rt);
  const auto animationIndicesCount = animationIndices.size(rt);
  result.reserve(animationIndicesCount);

  for (size_t i = 0; i < animationIndicesCount; i++) {
    const auto &indexStr = animationIndices.getValueAtIndex(rt, i).toString(rt);
    const auto &animationSettings = settingsObj.getProperty(rt, indexStr);

    const auto index = std::stoul(indexStr.utf8(rt));
    result[index] = parseFunction(rt, animationSettings);
  }

  return result;
}

CSSAnimationSettingsMap parseNewAnimationSettings(
    jsi::Runtime &rt,
    const std::vector<std::string> &animationNames,
    const jsi::Value &newSettings) {
  return parseHelper<CSSAnimationSettings>(
      rt,
      newSettings.asObject(rt),
      [&](jsi::Runtime &rt, const jsi::Value &settings) {
        return parseCSSAnimationSettings(rt, settings);
      });
}

CSSAnimationSettingsUpdatesMap parseSettingsUpdates(
    jsi::Runtime &rt,
    const jsi::Value &settingsUpdates) {
  return parseHelper<PartialCSSAnimationSettings>(
      rt,
      settingsUpdates.asObject(rt),
      [](jsi::Runtime &rt, const jsi::Value &settings) {
        return parsePartialCSSAnimationSettings(rt, settings);
      });
}

CSSAnimationUpdates parseCSSAnimationUpdates(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  const auto &configObj = config.asObject(rt);

  CSSAnimationUpdates result;

  if (configObj.hasProperty(rt, "animationNames")) {
    const auto animationNames =
        parseAnimationNames(rt, configObj.getProperty(rt, "animationNames"));
    result.animationNames = std::move(animationNames);

    if (configObj.hasProperty(rt, "newAnimationSettings")) {
      result.newAnimationSettings = parseNewAnimationSettings(
          rt,
          animationNames,
          configObj.getProperty(rt, "newAnimationSettings"));
    }
  }

  if (configObj.hasProperty(rt, "settingsUpdates")) {
    result.settingsUpdates =
        parseSettingsUpdates(rt, configObj.getProperty(rt, "settingsUpdates"));
  }

  return result;
}

} // namespace reanimated::css
