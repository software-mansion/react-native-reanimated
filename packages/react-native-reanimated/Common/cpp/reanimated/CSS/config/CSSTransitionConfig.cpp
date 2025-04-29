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

TransitionProperties getProperties(const folly::dynamic &config) {
  if (config["properties"].isArray()) {
    PropertyNames properties;
    const auto &propertiesArray = config["properties"];

    for (const auto &property : propertiesArray) {
      properties.emplace_back(property.asString());
    }

    return properties;
  }

  return std::nullopt;
}

bool getAllowDiscrete(const folly::dynamic &config) {
  return config["allowDiscrete"].asBool();
}

CSSTransitionPropertiesSettings parseCSSTransitionPropertiesSettings(
    const folly::dynamic &settings) {
  CSSTransitionPropertiesSettings result;

  for (const auto &pair : settings.items()) {
    const std::string propertyName = pair.first.asString();
    const auto &propertySettings = pair.second;

    result.emplace(
        propertyName,
        CSSTransitionPropertySettings{
            getDuration(propertySettings),
            getTimingFunction(propertySettings),
            getDelay(propertySettings),
            getAllowDiscrete(propertySettings)});
  }

  return result;
}

CSSTransitionConfig parseCSSTransitionConfig(const folly::dynamic &config) {
  return CSSTransitionConfig{
      getProperties(config),
      parseCSSTransitionPropertiesSettings(config["settings"])};
}

PartialCSSTransitionConfig parsePartialCSSTransitionConfig(
    const folly::dynamic &partialConfig) {
  PartialCSSTransitionConfig result;

  if (partialConfig.count("properties")) {
    result.properties = getProperties(partialConfig);
  }
  if (partialConfig.count("settings")) {
    result.settings =
        parseCSSTransitionPropertiesSettings(partialConfig["settings"]);
  }

  return result;
}

} // namespace reanimated::css
