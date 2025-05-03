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

TransitionProperties parseProperties(const folly::dynamic &properties) {
  if (!properties.isArray()) {
    return std::nullopt;
  }

  PropertyNames result;
  result.reserve(properties.size());

  for (const auto &property : properties) {
    result.push_back(property.asString());
  }

  return result;
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
      parseProperties(config["properties"]),
      parseCSSTransitionPropertiesSettings(config["settings"])};
}

CSSTransitionConfigUpdates getParsedCSSTransitionConfigUpdates(
    const folly::dynamic &oldConfig,
    const folly::dynamic &newConfig) {
  CSSTransitionConfigUpdates result;

  if (oldConfig["properties"] != newConfig["properties"]) {
    result.properties = parseProperties(newConfig["properties"]);
  }
  if (oldConfig["settings"] != newConfig["settings"]) {
    result.settings =
        parseCSSTransitionPropertiesSettings(newConfig["settings"]);
  }

  if (!result.properties.has_value() && !result.settings.has_value()) {
    return std::nullopt;
  }

  return result;
}

// TODO - remove this implementation when CSS refactor is finished
CSSTransitionConfigUpdates getParsedCSSTransitionConfigUpdates(
    const folly::dynamic &partialConfig) {
  CSSTransitionConfigUpdates result;

  if (partialConfig.count("properties")) {
    result.properties = parseProperties(partialConfig["properties"]);
  }
  if (partialConfig.count("settings")) {
    result.settings =
        parseCSSTransitionPropertiesSettings(partialConfig["settings"]);
  }

  return result;
}

} // namespace reanimated::css
