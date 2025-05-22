#include <reanimated/CSS/config/CSSAnimationConfig.h>

namespace reanimated::css {

double getIterationCount(const folly::dynamic &settings) {
  return settings["iterationCount"].asDouble();
}

AnimationDirection getDirection(const folly::dynamic &settings) {
  static const std::unordered_map<std::string, AnimationDirection>
      strToEnumMap = {
          {"normal", AnimationDirection::Normal},
          {"reverse", AnimationDirection::Reverse},
          {"alternate", AnimationDirection::Alternate},
          {"alternate-reverse", AnimationDirection::AlternateReverse}};

  const auto str = settings["direction"].asString();
  auto it = strToEnumMap.find(str);
  if (it == strToEnumMap.cend()) {
    throw std::invalid_argument(
        "[Reanimated] Invalid animationDirection: " + str);
  }
  return it->second;
}

AnimationFillMode getFillMode(const folly::dynamic &settings) {
  static const std::unordered_map<std::string, AnimationFillMode> strToEnumMap =
      {{"none", AnimationFillMode::None},
       {"forwards", AnimationFillMode::Forwards},
       {"backwards", AnimationFillMode::Backwards},
       {"both", AnimationFillMode::Both}};

  const auto str = settings["fillMode"].asString();
  auto it = strToEnumMap.find(str);
  if (it == strToEnumMap.cend()) {
    throw std::invalid_argument(
        "[Reanimated] Invalid animationFillMode: " + str);
  }
  return it->second;
}

AnimationPlayState getPlayState(const folly::dynamic &settings) {
  static const std::unordered_map<std::string, AnimationPlayState>
      strToEnumMap = {
          {"running", AnimationPlayState::Running},
          {"paused", AnimationPlayState::Paused}};

  const auto str = settings["playState"].asString();
  auto it = strToEnumMap.find(str);
  if (it == strToEnumMap.cend()) {
    throw std::invalid_argument(
        "[Reanimated] Invalid animationPlayState: " + str);
  }
  return it->second;
}

CSSAnimationSettings parseCSSAnimationSettings(const folly::dynamic &settings) {
  return CSSAnimationSettings{
      getDuration(settings),
      getTimingFunction(settings),
      getDelay(settings),
      getIterationCount(settings),
      getDirection(settings),
      getFillMode(settings),
      getPlayState(settings)};
}

PartialCSSAnimationSettings parsePartialCSSAnimationSettings(
    const folly::dynamic &partialSettings) {
  PartialCSSAnimationSettings result;

  if (partialSettings.count("duration")) {
    result.duration = getDuration(partialSettings);
  }
  if (partialSettings.count("timingFunction")) {
    result.easingFunction = getTimingFunction(partialSettings);
  }
  if (partialSettings.count("delay")) {
    result.delay = getDelay(partialSettings);
  }
  if (partialSettings.count("iterationCount")) {
    result.iterationCount = getIterationCount(partialSettings);
  }
  if (partialSettings.count("direction")) {
    result.direction = getDirection(partialSettings);
  }
  if (partialSettings.count("fillMode")) {
    result.fillMode = getFillMode(partialSettings);
  }
  if (partialSettings.count("playState")) {
    result.playState = getPlayState(partialSettings);
  }

  return result;
}

std::vector<std::string> parseAnimationNames(
    const folly::dynamic &animationNames) {
  std::vector<std::string> result;

  if (animationNames.isArray()) {
    for (const auto &name : animationNames) {
      result.emplace_back(name.asString());
    }
  }

  return result;
}

template <typename TResult>
std::unordered_map<size_t, TResult> parseHelper(
    const folly::dynamic &settingsObj,
    std::function<TResult(const folly::dynamic &)> parseFunction) {
  std::unordered_map<size_t, TResult> result;

  if (settingsObj.isObject()) {
    for (const auto &pair : settingsObj.items()) {
      const size_t index = std::stoul(pair.first.asString());
      result[index] = parseFunction(pair.second);
    }
  }

  return result;
}

CSSAnimationSettingsMap parseNewAnimationSettings(
    const std::vector<std::string> &animationNames,
    const folly::dynamic &newSettings) {
  return parseHelper<CSSAnimationSettings>(
      newSettings, [](const folly::dynamic &settings) {
        return parseCSSAnimationSettings(settings);
      });
}

CSSAnimationSettingsUpdatesMap parseSettingsUpdates(
    const folly::dynamic &settingsUpdates) {
  return parseHelper<PartialCSSAnimationSettings>(
      settingsUpdates, [](const folly::dynamic &settings) {
        return parsePartialCSSAnimationSettings(settings);
      });
}

CSSAnimationUpdates parseCSSAnimationUpdates(const folly::dynamic &config) {
  CSSAnimationUpdates result;

  if (config.count("animationNames")) {
    result.animationNames = parseAnimationNames(config["animationNames"]);
  }
  if (config.count("newAnimationSettings") && result.animationNames) {
    result.newAnimationSettings = parseNewAnimationSettings(
        *result.animationNames, config["newAnimationSettings"]);
  }
  if (config.count("settingsUpdates")) {
    result.settingsUpdates = parseSettingsUpdates(config["settingsUpdates"]);
  }

  return result;
}

} // namespace reanimated::css
