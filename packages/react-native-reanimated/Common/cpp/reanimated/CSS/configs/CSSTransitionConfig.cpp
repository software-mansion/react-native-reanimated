#include <reanimated/CSS/configs/CSSTransitionConfig.h>

#include <reanimated/CSS/configs/common.h>

#include <utility>

namespace reanimated::css {

CSSTransitionPropertyUpdates parsePropertyUpdates(jsi::Runtime &rt, const jsi::Object &diffs) {
  CSSTransitionPropertyUpdates result;
  const auto propertyNames = diffs.getPropertyNames(rt);
  const auto propertyCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertyCount; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto diffValue = diffs.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName));

    if (diffValue.isNull()) {
      result.emplace(propertyName, std::nullopt);
      continue;
    }

    if (!diffValue.isObject()) {
      continue;
    }

    const auto diffArray = diffValue.asObject(rt).asArray(rt);
    if (diffArray.size(rt) != 2) {
      continue;
    }

    result.emplace(
        propertyName,
        std::make_optional(std::make_pair(
            diffArray.getValueAtIndex(rt, 0), diffArray.getValueAtIndex(rt, 1))));
  }

  return result;
}

PartialCSSTransitionPropertySettings parsePartialPropertySettings(
    jsi::Runtime &rt,
    const jsi::Object &settings) {
  PartialCSSTransitionPropertySettings result;

  if (settings.hasProperty(rt, "duration")) {
    result.duration = getDuration(rt, settings);
  }

  if (settings.hasProperty(rt, "timingFunction")) {
    result.easingFunction = getTimingFunction(rt, settings);
  }

  if (settings.hasProperty(rt, "delay")) {
    result.delay = getDelay(rt, settings);
  }

  if (settings.hasProperty(rt, "allowDiscrete")) {
    result.allowDiscrete = settings.getProperty(rt, "allowDiscrete").getBool();
  }

  return result;
}

CSSTransitionPropertySettingsUpdates parseSettingsUpdates(jsi::Runtime &rt, const jsi::Object &settings) {
  CSSTransitionPropertySettingsUpdates result;
  const auto propertyNames = settings.getPropertyNames(rt);
  const auto propertyCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertyCount; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto propertyValue = settings.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName));

    if (!propertyValue.isObject()) {
      continue;
    }

    const auto propertySettings = propertyValue.asObject(rt);
    auto parsedSettings = parsePartialPropertySettings(rt, propertySettings);
    result.emplace(propertyName, std::move(parsedSettings));
  }

  return result;
}

CSSTransitionPropertiesSettings parseSettings(jsi::Runtime &rt, const jsi::Object &settings) {
  CSSTransitionPropertiesSettings result;
  const auto propertyNames = settings.getPropertyNames(rt);
  const auto propertyCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertyCount; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto propertySettings = settings.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName)).asObject(rt);

    result.emplace(
        propertyName,
        CSSTransitionPropertySettings{
            getDuration(rt, propertySettings),
            getTimingFunction(rt, propertySettings),
            getDelay(rt, propertySettings),
            propertySettings.getProperty(rt, "allowDiscrete").asBool()});
  }

  return result;
}

std::optional<CSSTransitionPropertySettings> getTransitionPropertySettings(
    const CSSTransitionPropertiesSettings &propertiesSettings,
    const std::string &propName) {
  const auto &propIt = propertiesSettings.find(propName);
  if (propIt != propertiesSettings.end()) {
    return propIt->second;
  }

  const auto &allIt = propertiesSettings.find("all");
  if (allIt != propertiesSettings.end()) {
    return allIt->second;
  }

  return std::nullopt;
}

CSSTransitionConfig parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config) {
  const auto configObj = config.asObject(rt);

  CSSTransitionConfig result{
      .properties = parsePropertyUpdates(rt, configObj.getProperty(rt, "properties").asObject(rt)),
      .settings = parseSettings(rt, configObj.getProperty(rt, "settings").asObject(rt)),
  };

  return result;
}

CSSTransitionUpdates parseCSSTransitionUpdates(jsi::Runtime &rt, const jsi::Value &updates) {
  const auto updatesObj = updates.asObject(rt);
  CSSTransitionUpdates result{
      .properties = parsePropertyUpdates(rt, updatesObj.getProperty(rt, "properties").asObject(rt)),
  };

  if (updatesObj.hasProperty(rt, "settings")) {
    const auto settingsValue = updatesObj.getProperty(rt, "settings");
    auto settingsUpdates = parseSettingsUpdates(rt, settingsValue.asObject(rt));
    if (!settingsUpdates.empty()) {
      result.settings = std::move(settingsUpdates);
    }
  }

  return result;
}

} // namespace reanimated::css
