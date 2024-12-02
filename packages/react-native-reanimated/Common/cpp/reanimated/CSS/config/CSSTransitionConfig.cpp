#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/config/CSSTransitionConfig.h>

namespace reanimated {

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
            getDelay(rt, propertySettings)});
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
          rt, configObj.getProperty(rt, "settings").asObject(rt)),
      configObj.getProperty(rt, "allowDiscrete").asBool()};
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
  if (partialObj.hasProperty(rt, "allowDiscrete")) {
    result.allowDiscrete = partialObj.getProperty(rt, "allowDiscrete").asBool();
  }

  return result;
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
