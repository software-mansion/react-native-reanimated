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

std::optional<CSSTransitionPropertiesSettings> parseCSSTransitionPropertiesSettings(
    jsi::Runtime &rt,
    const jsi::Value &settings) {
  if (settings.isUndefined() || settings.isNull() || !settings.isObject()) {
    return std::nullopt;
  }

  const auto settingsObj = settings.asObject(rt);
  CSSTransitionPropertiesSettings result;

  const auto propertyNames = settingsObj.getPropertyNames(rt);
  const auto propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto propertySettings = settingsObj.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName)).asObject(rt);

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
  const auto settingsValue = configObj.getProperty(rt, "settings");
  const auto settings = parseCSSTransitionPropertiesSettings(rt, settingsValue);

  return CSSTransitionConfig{getProperties(rt, configObj), settings.value_or(CSSTransitionPropertiesSettings{})};
}

ChangedProps parseChangedPropsFromDiff(const folly::dynamic &diff) {
  folly::dynamic oldProps = folly::dynamic::object();
  folly::dynamic newProps = folly::dynamic::object();
  PropertyNames changedPropertyNames;
  PropertyNames removedPropertyNames;

  if (diff.isObject()) {
    // Parse the diff object where each key is a changed property
    // and value is either [oldValue, newValue] array or null for removed properties
    for (const auto &[key, value] : diff.items()) {
      const auto &propName = key.asString();

      if (value.isNull()) {
        // Property should be removed from transition immediately
        removedPropertyNames.emplace_back(propName);
      } else if (value.isArray() && value.size() == 2) {
        // Normal transition: [oldValue, newValue]
        oldProps[propName] = value[0];
        newProps[propName] = value[1];
        changedPropertyNames.emplace_back(propName);
      }
    }
  }

  return ChangedProps{oldProps, newProps, changedPropertyNames, removedPropertyNames};
}

} // namespace reanimated::css
