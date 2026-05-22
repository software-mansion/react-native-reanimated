#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/configs/common.h>
#include <reanimated/CSS/utils/props.h>

namespace reanimated::css {

bool getAllowDiscrete(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "allowDiscrete").asBool();
}

CSSTransitionConfig
parseCSSTransitionConfig(jsi::Runtime &rt, const std::string &componentName, const jsi::Value &config) {
  const auto configObj = config.asObject(rt);
  const auto propertyNames = configObj.getPropertyNames(rt);
  const auto propertiesCount = propertyNames.size(rt);

  CSSTransitionConfig result;

  for (size_t i = 0; i < propertiesCount; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto propertyValue = configObj.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName));

    if (propertyValue.isNull() || propertyValue.isUndefined()) {
      result.removedProperties.emplace_back(propertyName);
      continue;
    }

    const auto propertySettingsObj = propertyValue.asObject(rt);
    const auto allowDiscrete = getAllowDiscrete(rt, propertySettingsObj);

    // Inherently-discrete properties without allowDiscrete are not transitioned;
    // route them to removedProperties so any active animation cleans up.
    if (!allowDiscrete && isDiscreteProperty(propertyName, componentName)) {
      result.removedProperties.emplace_back(propertyName);
      continue;
    }

    const auto valueArray = propertySettingsObj.getProperty(rt, "value").asObject(rt).asArray(rt);
    auto oldValue = valueArray.getValueAtIndex(rt, 0);
    auto newValue = valueArray.getValueAtIndex(rt, 1);

    result.changedPropertiesSettings.emplace(
        propertyName,
        CSSTransitionPropertySettings{
            getDuration(rt, propertySettingsObj),
            getEasingConfig(rt, propertySettingsObj),
            getDelay(rt, propertySettingsObj),
            allowDiscrete,
        });

    result.changedProperties.emplace(propertyName, std::make_pair(std::move(oldValue), std::move(newValue)));
  }

  return result;
}

} // namespace reanimated::css
