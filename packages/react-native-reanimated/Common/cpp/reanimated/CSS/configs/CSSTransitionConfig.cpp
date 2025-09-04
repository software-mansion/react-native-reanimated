#include <reanimated/CSS/configs/CSSTransitionConfig.h>

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

TransitionProperties getProperties(
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

bool getAllowDiscrete(jsi::Runtime &rt, const jsi::Object &config) {
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
            getDuration(rt, propertySettings),
            getTimingFunction(rt, propertySettings),
            getDelay(rt, propertySettings),
            getAllowDiscrete(rt, propertySettings)});
  }

  return result;
}

CSSTransitionConfig parseCSSTransitionConfig(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  const auto configObj = config.asObject(rt);
  return CSSTransitionConfig{
      getProperties(rt, configObj),
      parseCSSTransitionPropertiesSettings(
          rt, configObj.getProperty(rt, "settings").asObject(rt))};
}

PartialCSSTransitionConfig parsePartialCSSTransitionConfig(
    jsi::Runtime &rt,
    const jsi::Value &partialConfig) {
  const auto partialObj = partialConfig.asObject(rt);

  PartialCSSTransitionConfig result;

  if (partialObj.hasProperty(rt, "properties")) {
    result.properties = getProperties(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "settings")) {
    result.settings = parseCSSTransitionPropertiesSettings(
        rt, partialObj.getProperty(rt, "settings").asObject(rt));
  }

  return result;
}

} // namespace reanimated::css
