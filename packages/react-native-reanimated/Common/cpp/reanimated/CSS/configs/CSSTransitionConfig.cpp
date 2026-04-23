#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/configs/common.h>

namespace reanimated::css {

bool getAllowDiscrete(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "allowDiscrete").asBool();
}

CSSTransitionConfig<jsi::Value> parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config) {
  const auto configObj = config.asObject(rt);
  const auto propertyNames = configObj.getPropertyNames(rt);
  const auto propertiesCount = propertyNames.size(rt);

  CSSTransitionConfig<jsi::Value> result;

  for (size_t i = 0; i < propertiesCount; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto propertyValue = configObj.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName));

    if (propertyValue.isNull() || propertyValue.isUndefined()) {
      result.removedProperties.emplace_back(propertyName);
    } else {
      const auto propertySettingsObj = propertyValue.asObject(rt);

      const auto valueArray = propertySettingsObj.getProperty(rt, "value").asObject(rt).asArray(rt);
      auto oldValue = valueArray.getValueAtIndex(rt, 0);
      auto newValue = valueArray.getValueAtIndex(rt, 1);

      result.changedProperties.emplace(
          propertyName,
          CSSTransitionPropertySettings<jsi::Value>{
              std::make_pair(std::move(oldValue), std::move(newValue)),
              getDuration(rt, propertySettingsObj),
              getTimingFunction(rt, propertySettingsObj),
              getDelay(rt, propertySettingsObj),
              getAllowDiscrete(rt, propertySettingsObj),
          });
    }
  }

  return result;
}

bool getAllowDiscrete(const folly::dynamic &config) {
  return config.at("allowDiscrete").asBool();
}

CSSTransitionConfig<folly::dynamic> parseCSSTransitionConfig(const folly::dynamic &config) {
  CSSTransitionConfig<folly::dynamic> result;

  if (!config.isObject()) {
    return result;
  }

  for (const auto &[keyDyn, propertyValue] : config.items()) {
    const auto propertyName = keyDyn.asString();

    if (propertyValue.isNull()) {
      result.removedProperties.emplace_back(propertyName);
    } else {
      const auto &valueArray = propertyValue.at("value");

      result.changedProperties.emplace(
          propertyName,
          CSSTransitionPropertySettings<folly::dynamic>{
              std::make_pair(valueArray[0], valueArray[1]),
              getDuration(propertyValue),
              getTimingFunction(propertyValue),
              getDelay(propertyValue),
              getAllowDiscrete(propertyValue),
          });
    }
  }

  return result;
}

} // namespace reanimated::css
