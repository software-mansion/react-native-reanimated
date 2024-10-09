#include <reanimated/CSS/config/CSSTransitionConfig.h>

namespace reanimated {

TransitionProperties::TransitionProperties(
    jsi::Runtime &rt,
    const jsi::Value &transitionProperty)
    : properties_(parseProperties(rt, transitionProperty)) {}

std::optional<PropertyNames> TransitionProperties::get() const {
  if (std::holds_alternative<PropertyNames>(properties_)) {
    return std::get<PropertyNames>(properties_);
  }
  return std::nullopt; // All style properties can trigger transition
}

std::variant<PropertyNames, bool> TransitionProperties::parseProperties(
    jsi::Runtime &rt,
    const jsi::Value &transitionProperty) {
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

  return true;
};

inline TransitionProperties getTransitionProperty(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return TransitionProperties(rt, config.getProperty(rt, "transitionProperty"));
}

inline double getTransitionDuration(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return config.getProperty(rt, "transitionDuration").asNumber();
}

inline EasingFunction getTransitionTimingFunction(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  const auto str = config.getProperty(rt, "transitionTimingFunction");
  return getEasingFunction(rt, str);
}

inline double getTransitionDelay(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "transitionDelay").asNumber();
}

CSSTransitionConfig parseCSSTransitionConfig(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  const auto &configObj = config.asObject(rt);

  return CSSTransitionConfig{
      getTransitionProperty(rt, configObj),
      getTransitionDuration(rt, configObj),
      getTransitionTimingFunction(rt, configObj),
      getTransitionDelay(rt, configObj)};
}

PartialCSSTransitionSettings parsePartialCSSTransitionSettings(
    jsi::Runtime &rt,
    const jsi::Value &partialSettings) {
  const auto &partialObj = partialSettings.asObject(rt);

  PartialCSSTransitionSettings result;

  if (partialObj.hasProperty(rt, "transitionProperty")) {
    result.properties = getTransitionProperty(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "transitionDuration")) {
    result.duration = getTransitionDuration(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "transitionTimingFunction")) {
    result.easingFunction = getTransitionTimingFunction(rt, partialObj);
  }
  if (partialObj.hasProperty(rt, "transitionDelay")) {
    result.delay = getTransitionDelay(rt, partialObj);
  }

  return result;
}

} // namespace reanimated
