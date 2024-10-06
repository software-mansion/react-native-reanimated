#include <reanimated/CSS/config/CSSTransitionConfig.h>

namespace reanimated {

inline jsi::Array getTransitionProperty(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return config.getProperty(rt, "transitionProperty").asObject(rt).asArray(rt);
}

inline double getTransitionDuration(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return config.getProperty(rt, "transitionDuration").asNumber();
}

inline EasingFunction getTransitionTimingFunction(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  const auto str = config.getProperty(rt, "animationTimingFunction");
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
