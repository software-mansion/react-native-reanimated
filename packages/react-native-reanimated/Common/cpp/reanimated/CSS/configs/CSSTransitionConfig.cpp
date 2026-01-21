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

bool getAllowDiscrete(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "allowDiscrete").asBool();
}

CSSTransitionConfig parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config) {
  const auto configObj = config.asObject(rt);
  const auto propertyNames = configObj.getPropertyNames(rt);
  const auto propertiesCount = propertyNames.size(rt);

  CSSTransitionConfig result;

  for (size_t i = 0; i < propertiesCount; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto propertyValue = configObj.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName));

    if (propertyValue.isNull() || propertyValue.isUndefined()) {
      result.removedProperties.insert(propertyName);
    } else {
      const auto propertySettingsObj = propertyValue.asObject(rt);

      const auto valueArray = propertySettingsObj.getProperty(rt, "value").asObject(rt).asArray(rt);
      const auto oldValue = valueArray.getValueAtIndex(rt, 0);
      const auto newValue = valueArray.getValueAtIndex(rt, 1);

      result.changedProperties.emplace(
          propertyName,
          CSSTransitionPropertySettings{
              getDuration(rt, propertySettingsObj),
              getTimingFunction(rt, propertySettingsObj),
              getDelay(rt, propertySettingsObj),
              getAllowDiscrete(rt, propertySettingsObj),
              std::make_pair(jsi::dynamicFromValue(rt, oldValue), jsi::dynamicFromValue(rt, newValue))});
    }
  }

  return result;
}

} // namespace reanimated::css
