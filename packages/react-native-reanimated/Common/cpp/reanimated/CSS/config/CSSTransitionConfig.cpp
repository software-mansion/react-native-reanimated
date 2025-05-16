#include <reanimated/CSS/config/CSSTransitionConfig.h>

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

TransitionProperties parseProperties(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  const auto transitionProperty = config.getProperty(rt, "properties");

  if (transitionProperty.isObject()) {
    PropertyNames properties;

    const auto propertiesArray = transitionProperty.asObject(rt).asArray(rt);
    const auto propertiesCount = propertiesArray.size(rt);
    for (size_t i = 0; i < propertiesCount; ++i) {
      properties.emplace_back(
          propertiesArray.getValueAtIndex(rt, i).asString(rt).utf8(rt));
    }

    return properties;
  }

  return std::nullopt;
}

bool parseAllowDiscrete(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "allowDiscrete").asBool();
}

CSSTransitionPropertiesSettings parseCSSTransitionPropertiesSettings(
    jsi::Runtime &rt,
    const jsi::Object &settings) {
  CSSTransitionPropertiesSettings result;

  const auto propertyNames = settings.getPropertyNames(rt);
  const auto propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const auto propertyName =
        propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto propertySettings =
        settings.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName))
            .asObject(rt);

    result.emplace(
        propertyName,
        CSSTransitionPropertySettings{
            parseDuration(rt, propertySettings),
            parseTimingFunction(rt, propertySettings),
            parseDelay(rt, propertySettings),
            parseAllowDiscrete(rt, propertySettings)});
  }

  return result;
}

bool CSSTransitionPropertySettings::operator==(
    const CSSTransitionPropertySettings &other) const {
  return duration == other.duration && easing == other.easing &&
      delay == other.delay && allowDiscrete == other.allowDiscrete;
}

CSSTransitionConfig::CSSTransitionConfig(
    TransitionProperties properties,
    CSSTransitionPropertiesSettings settings)
    : properties(properties), settings(settings) {}

CSSTransitionConfig::CSSTransitionConfig(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  const auto configObj = config.asObject(rt);
  properties = parseProperties(rt, configObj);
  settings = parseCSSTransitionPropertiesSettings(
      rt, configObj.getProperty(rt, "settings").asObject(rt));
}

bool CSSTransitionConfig::operator==(const CSSTransitionConfig &other) const {
  // First check if it's the same object
  if (this == &other) {
    return true;
  }

  // Compare properties (optional vector of strings)
  if (properties.has_value() != other.properties.has_value()) {
    return false;
  }
  if (properties.has_value() &&
      properties.value() != other.properties.value()) {
    return false;
  }

  // Compare settings (unordered map mapping property names to settings)
  return settings == other.settings;
}

CSSTransitionConfig parseCSSTransitionConfig(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  const auto configObj = config.asObject(rt);
  return CSSTransitionConfig{
      parseProperties(rt, configObj),
      parseCSSTransitionPropertiesSettings(
          rt, configObj.getProperty(rt, "settings").asObject(rt))};
}

CSSTransitionConfigUpdates getParsedCSSTransitionConfigUpdates(
    jsi::Runtime &rt,
    const jsi::Value &partialConfig) {
  const auto partialObj = partialConfig.asObject(rt);

  CSSTransitionConfigUpdates result;

  if (partialObj.hasProperty(rt, "properties")) {
    result.properties = parseProperties(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "settings")) {
    result.settings = parseCSSTransitionPropertiesSettings(
        rt, partialObj.getProperty(rt, "settings").asObject(rt));
  }

  return result;
}

} // namespace reanimated::css
