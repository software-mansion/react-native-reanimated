#include <reanimated/CSS/config/CSSAnimationConfig.h>

namespace reanimated::css {

std::string parseName(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "name").asString(rt).utf8(rt);
}

double parseIterationCount(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "iterationCount").asNumber();
}

AnimationDirection parseDirection(jsi::Runtime &rt, const jsi::Object &config) {
  static const std::unordered_map<std::string, AnimationDirection>
      strToEnumMap = {
          {"normal", AnimationDirection::Normal},
          {"reverse", AnimationDirection::Reverse},
          {"alternate", AnimationDirection::Alternate},
          {"alternate-reverse", AnimationDirection::AlternateReverse}};

  const auto str = config.getProperty(rt, "direction").asString(rt).utf8(rt);
  auto it = strToEnumMap.find(str);
  if (it == strToEnumMap.cend()) {
    throw std::invalid_argument(
        "[Reanimated] Invalid animationDirection: " + str);
  }
  return it->second;
}

AnimationFillMode parseFillMode(jsi::Runtime &rt, const jsi::Object &config) {
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

AnimationPlayState parsePlayState(jsi::Runtime &rt, const jsi::Object &config) {
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

CSSAnimationSettings parseCSSAnimationSettings(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  const auto &settingsObj = config.asObject(rt);

  return {
      parseDuration(rt, settingsObj),
      parseTimingFunction(rt, settingsObj),
      parseDelay(rt, settingsObj),
      parseIterationCount(rt, settingsObj),
      parseDirection(rt, settingsObj),
      parseFillMode(rt, settingsObj),
      parsePlayState(rt, settingsObj)};
}

PartialCSSAnimationSettings parsePartialCSSAnimationSettings(
    jsi::Runtime &rt,
    const jsi::Value &partialSettings) {
  const auto &partialObj = partialSettings.asObject(rt);

  PartialCSSAnimationSettings result;

  if (partialObj.hasProperty(rt, "duration")) {
    result.duration = parseDuration(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "timingFunction")) {
    result.easing = parseTimingFunction(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "delay")) {
    result.delay = parseDelay(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "iterationCount")) {
    result.iterationCount = parseIterationCount(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "direction")) {
    result.direction = parseDirection(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "fillMode")) {
    result.fillMode = parseFillMode(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "playState")) {
    result.playState = parsePlayState(rt, partialObj);
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
      [&](jsi::Runtime &rt, const jsi::Value &config) {
        return parseCSSAnimationSettings(rt, config);
      });
}

CSSAnimationSettingsUpdatesMap parseSettingsUpdates(
    jsi::Runtime &rt,
    const jsi::Value &settingsUpdates) {
  return parseHelper<PartialCSSAnimationSettings>(
      rt,
      settingsUpdates.asObject(rt),
      [](jsi::Runtime &rt, const jsi::Value &config) {
        return parsePartialCSSAnimationSettings(rt, config);
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

CSSAnimationConfig::CSSAnimationConfig(
    const std::string &name,
    double duration,
    std::shared_ptr<Easing> easing,
    double delay,
    double iterationCount,
    AnimationDirection direction,
    AnimationFillMode fillMode,
    AnimationPlayState playState)
    : CSSAnimationSettings{duration, easing, delay, iterationCount, direction, fillMode, playState},
      name(name) {}

CSSAnimationConfig::CSSAnimationConfig(
    const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry,
    const RawValue &rawValue) {
  parseRawValue(rawValue, [this](jsi::Runtime &rt, const jsi::Value &value) {
    const auto configObj = value.asObject(rt);
    name = parseName(rt, configObj);
    duration = parseDuration(rt, configObj);
    easing = parseTimingFunction(rt, configObj);
    delay = parseDelay(rt, configObj);
    iterationCount = parseIterationCount(rt, configObj);
    direction = parseDirection(rt, configObj);
    fillMode = parseFillMode(rt, configObj);
    playState = parsePlayState(rt, configObj);
  });
}

bool CSSAnimationConfig::operator==(const CSSAnimationConfig &other) const {
  // First check if it's the same object
  if (this == &other) {
    return true;
  }

  return duration == other.duration && easing == other.easing &&
      delay == other.delay && iterationCount == other.iterationCount &&
      direction == other.direction && fillMode == other.fillMode &&
      playState == other.playState && name == other.name;
}

} // namespace reanimated::css
