#include <reanimated/CSS/config/CSSAnimationConfig.h>

namespace reanimated::css {

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

CSSAnimationSettings::CSSAnimationSettings(const RawValue &rawValue) {
  parseRawValue(rawValue, [this](jsi::Runtime &rt, const jsi::Value &value) {
    const auto &settingsObj = value.asObject(rt);

    duration = parseDuration(rt, settingsObj);
    easing = parseTimingFunction(rt, settingsObj);
    delay = parseDelay(rt, settingsObj);
    iterationCount = parseIterationCount(rt, settingsObj);
    direction = parseDirection(rt, settingsObj);
    fillMode = parseFillMode(rt, settingsObj);
    playState = parsePlayState(rt, settingsObj);
  });
}

CSSAnimationConfig::CSSAnimationConfig(
    AnimationTag tag,
    CSSAnimationSettings settings,
    const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry)
    : CSSAnimationSettings(std::move(settings)), tag(tag) {
  const auto &keyframesConfig = keyframesRegistry->get(tag);
  styleInterpolator = keyframesConfig.styleInterpolator;
  keyframeEasings = keyframesConfig.keyframeEasings;
}

CSSAnimationConfig::CSSAnimationConfig(
    const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry,
    const RawValue &rawValue)
    : CSSAnimationSettings(rawValue) {
  parseRawValue(
      rawValue,
      [this, keyframesRegistry](jsi::Runtime &rt, const jsi::Value &value) {
        const auto &keyframesConfig = keyframesRegistry->getOrCreate(rt, value);
        styleInterpolator = keyframesConfig.styleInterpolator;
        keyframeEasings = keyframesConfig.keyframeEasings;
      });
}

bool CSSAnimationConfig::operator==(const CSSAnimationConfig &other) const {
  // First check if it's the same object
  if (this == &other) {
    return true;
  }

  return tag == other.tag && duration == other.duration &&
      easing == other.easing && delay == other.delay &&
      iterationCount == other.iterationCount && direction == other.direction &&
      fillMode == other.fillMode && playState == other.playState;
}

// TODO - remove the following code later on

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

std::vector<AnimationTag> parseAnimationTags(
    jsi::Runtime &rt,
    const jsi::Value &animationTags) {
  std::vector<AnimationTag> result;

  const auto &tagsArray = animationTags.asObject(rt).asArray(rt);
  const auto animationTagsCount = tagsArray.size(rt);
  result.reserve(animationTagsCount);

  for (size_t i = 0; i < animationTagsCount; i++) {
    result.emplace_back(tagsArray.getValueAtIndex(rt, i).asNumber());
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
    const jsi::Value &newSettings) {
  return parseHelper<CSSAnimationSettings>(
      rt,
      newSettings.asObject(rt),
      [&](jsi::Runtime &rt, const jsi::Value &config) {
        return CSSAnimationSettings(RawValue(rt, config));
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

  if (configObj.hasProperty(rt, "animationTags")) {
    const auto animationTags =
        parseAnimationTags(rt, configObj.getProperty(rt, "animationTags"));
    result.animationTags = std::move(animationTags);

    if (configObj.hasProperty(rt, "newAnimationSettings")) {
      result.newAnimationSettings = parseNewAnimationSettings(
          rt, configObj.getProperty(rt, "newAnimationSettings"));
    }
  }

  if (configObj.hasProperty(rt, "settingsUpdates")) {
    result.settingsUpdates =
        parseSettingsUpdates(rt, configObj.getProperty(rt, "settingsUpdates"));
  }

  return result;
}

} // namespace reanimated::css
