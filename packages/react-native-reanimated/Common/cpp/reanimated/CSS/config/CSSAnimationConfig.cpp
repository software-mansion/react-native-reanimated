#include <reanimated/CSS/config/CSSAnimationConfig.h>

namespace reanimated {

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

  const auto &namesArray = animationNames.asArray(rt);
  const auto animationNamesCount = namesArray.size(rt);
  result.reserve(animationNamesCount);

  for (size_t i = 0; i < animationNamesCount; i++) {
    result.push_back(namesArray.getValueAtIndex(rt, i).asString(rt).utf8(rt));
  }

  return result;
}

std::unordered_map<std::string, std::shared_ptr<CSSAnimation>>
parseNewAnimations(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const jsi::Value &newSettings,
    double timestamp) {
  std::unordered_map<std::string, std::shared_ptr<CSSAnimation>> result;

  const auto &newSettingsObj = newSettings.asObject(rt);
  const auto &animationNames = newSettingsObj.getPropertyNames(rt);
  const auto animationNamesCount = animationNames.size(rt);
  result.reserve(animationNamesCount);

  for (size_t i = 0; i < animationNamesCount; i++) {
    const auto &name =
        animationNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto &settings = newSettingsObj.getProperty(rt, name.c_str());
    const auto &parsedSettings = parseCSSAnimationSettings(rt, settings);
    const auto &keyframesConfig = cssAnimationKeyframesRegistry_->get(name);

    result[name] = std::make_shared<CSSAnimation>(
        rt, shadowNode, name, keyframesConfig, parsedSettings, timestamp);
  }

  return result;
}

std::unordered_map<std::string, PartialCSSAnimationSettings>
parseSettingsUpdates(jsi::Runtime &rt, const jsi::Value &settingsUpdates) {
  std::unordered_map<std::string, PartialCSSAnimationSettings> result;

  const auto &settingsUpdatesObj = settingsUpdates.asObject(rt);
  const auto &names = settingsUpdatesObj.getPropertyNames(rt);
  const auto namesCount = names.size(rt);
  result.reserve(namesCount);

  for (size_t i = 0; i < namesCount; i++) {
    const auto &name = names.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto &settings = settingsUpdatesObj.getProperty(rt, name.c_str());
    result[name] = parsePartialCSSAnimationSettings(rt, settings);
  }

  return result;
}

} // namespace reanimated
