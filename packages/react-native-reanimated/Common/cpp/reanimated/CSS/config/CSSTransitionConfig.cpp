#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/config/CSSTransitionConfig.h>

namespace reanimated {

TransitionProperties getProperties(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  const auto &transitionProperty = config.getProperty(rt, "properties");

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

CSSTransitionConfig parseCSSTransitionConfig(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  const auto &configObj = config.asObject(rt);

  return CSSTransitionConfig{
      getProperties(rt, configObj),
      getDuration(rt, configObj),
      getTimingFunction(rt, configObj),
      getDelay(rt, configObj)};
}

PartialCSSTransitionSettings parsePartialCSSTransitionSettings(
    jsi::Runtime &rt,
    const jsi::Value &partialSettings) {
  const auto &partialObj = partialSettings.asObject(rt);

  PartialCSSTransitionSettings result;

  if (partialObj.hasProperty(rt, "properties")) {
    result.properties = getProperties(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "duration")) {
    result.duration = getDuration(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "timingFunction")) {
    result.easingFunction = getTimingFunction(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "delay")) {
    result.delay = getDelay(rt, partialObj);
  }

  return result;
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
