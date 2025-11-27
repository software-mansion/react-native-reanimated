#include <reanimated/CSS/configs/CSSTransitionConfig.h>

#include <string>

namespace reanimated::css {

std::optional<CSSTransitionPropertySettings> getTransitionPropertySettings(
    const CSSTransitionPropertiesSettings &propertiesSettings,
    const std::string &propName) {
  // Try to use property specific settings first
  const auto &propIt = propertiesSettings.find(propName);
  if (propIt != propertiesSettings.end()) {
    return propIt->second;
  }
  // Fallback to "all" settings if no property specific settings are available
  const auto &allIt = propertiesSettings.find("all");
  if (allIt != propertiesSettings.end()) {
    return allIt->second;
  }
  // Or return nullopt if no settings are available
  return std::nullopt;
}

TransitionProperties getProperties(jsi::Runtime &rt, const jsi::Object &config) {
  const auto transitionProperty = config.getProperty(rt, "properties");

  if (transitionProperty.isObject()) {
    PropertyNames properties;

    const auto propertiesArray = transitionProperty.asObject(rt).asArray(rt);
    const auto propertiesCount = propertiesArray.size(rt);
    for (size_t i = 0; i < propertiesCount; ++i) {
      properties.emplace_back(propertiesArray.getValueAtIndex(rt, i).asString(rt).utf8(rt));
    }

    return properties;
  }

  return std::nullopt;
}

bool getAllowDiscrete(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "allowDiscrete").asBool();
}

CSSTransitionPropertiesSettings parseCSSTransitionPropertiesSettings(jsi::Runtime &rt, const jsi::Object &settings) {
  CSSTransitionPropertiesSettings result;

  const auto propertyNames = settings.getPropertyNames(rt);
  const auto propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto propertySettings = settings.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName)).asObject(rt);

    result.emplace(
        propertyName,
        CSSTransitionPropertySettings{
            getDuration(rt, propertySettings),
            getTimingFunction(rt, propertySettings),
            getDelay(rt, propertySettings),
            getAllowDiscrete(rt, propertySettings)});
  }

  return result;
}

CSSTransitionConfig parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config) {
  const auto configObj = config.asObject(rt);
  return CSSTransitionConfig{
      getProperties(rt, configObj),
      parseCSSTransitionPropertiesSettings(rt, configObj.getProperty(rt, "settings").asObject(rt))};
}

PartialCSSTransitionConfig parsePartialCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &partialConfig) {
  const auto partialObj = partialConfig.asObject(rt);

  PartialCSSTransitionConfig result;

  if (partialObj.hasProperty(rt, "properties")) {
    result.properties = getProperties(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "settings")) {
    result.settings = parseCSSTransitionPropertiesSettings(rt, partialObj.getProperty(rt, "settings").asObject(rt));
  }

  return result;
}

static PartialCSSTransitionPropertySettings
parsePartialPropertySettings(jsi::Runtime &rt, const jsi::Object &settings) {
  PartialCSSTransitionPropertySettings result;

  if (settings.hasProperty(rt, "duration")) {
    result.duration = getDuration(rt, settings);
  }

  if (settings.hasProperty(rt, "delay")) {
    result.delay = getDelay(rt, settings);
  }

  if (settings.hasProperty(rt, "allowDiscrete")) {
    const auto allowDiscreteValue = settings.getProperty(rt, "allowDiscrete");
    if (allowDiscreteValue.isBool()) {
      result.allowDiscrete = allowDiscreteValue.getBool();
    }
  }

  if (settings.hasProperty(rt, "timingFunction")) {
    result.easingFunction = getTimingFunction(rt, settings);
  }

  return result;
}
static CSSTransitionPropertySettingsUpdates
parseSettingsUpdatesObject(jsi::Runtime &rt, const jsi::Object &settings) {
  CSSTransitionPropertySettingsUpdates result;
  const auto propertyNames = settings.getPropertyNames(rt);
  const auto count = propertyNames.size(rt);

  for (size_t i = 0; i < count; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto propertyValue = settings.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName));

    if (!propertyValue.isObject()) {
      continue;
    }

    const auto propertySettings = propertyValue.asObject(rt);
    result.emplace(propertyName, parsePartialPropertySettings(rt, propertySettings));
  }

  return result;
}
static CSSTransitionPropertyDiffs
parsePropertyDiffs(jsi::Runtime &rt, const jsi::Object &diffs) {
  CSSTransitionPropertyDiffs result;
  const auto propertyNames = diffs.getPropertyNames(rt);
  const auto count = propertyNames.size(rt);

  for (size_t i = 0; i < count; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto diffValue = diffs.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName));

    if (!diffValue.isObject()) {
      continue;
    }

    const auto diffArray = diffValue.asObject(rt).asArray(rt);
    if (diffArray.size(rt) != 2) {
      continue;
    }

    result.emplace(propertyName, std::make_pair(diffArray.getValueAtIndex(rt, 0), diffArray.getValueAtIndex(rt, 1)));
  }

  return result;
}

CSSTransitionUpdates parseCSSTransitionUpdates(jsi::Runtime &rt, const jsi::Value &updates) {
  const auto updatesObj = updates.asObject(rt);

  CSSTransitionUpdates result;

  if (updatesObj.hasProperty(rt, "properties")) {
    const auto propertiesValue = updatesObj.getProperty(rt, "properties");
    auto propertyDiffs = parsePropertyDiffs(rt, propertiesValue.asObject(rt));
    if (!propertyDiffs.empty()) {
      result.properties = std::move(propertyDiffs);
    }
  }

  if (updatesObj.hasProperty(rt, "settings")) {
    const auto settingsValue = updatesObj.getProperty(rt, "settings");
    auto settingsUpdates = parseSettingsUpdatesObject(rt, settingsValue.asObject(rt));
    if (!settingsUpdates.empty()) {
      result.settings = std::move(settingsUpdates);
    }
  }

  return result;
}

} // namespace reanimated::css
