#include <reanimated/CSS/configs/common.h>

#include <react/renderer/componentregistry/componentNameByReactViewName.h>

using facebook::react::componentNameByReactViewName;

namespace reanimated::css {

double getDuration(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "duration").asNumber();
}

EasingFunction getTimingFunction(jsi::Runtime &rt, const jsi::Object &config) {
  return createEasingFunction(rt, config.getProperty(rt, "timingFunction"));
}

double getDelay(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "delay").asNumber();
}

std::string
getCompoundComponentName(jsi::Runtime &rt, const jsi::Value &reactViewName, const jsi::Value &jsComponentName) {
  const auto nativeComponentName = componentNameByReactViewName(reactViewName.asString(rt).utf8(rt));
  return nativeComponentName + "$" + jsComponentName.asString(rt).utf8(rt);
}

std::string
getCompoundComponentName(jsi::Runtime &rt, const std::string &nativeComponentName, const jsi::Value &jsComponentName) {
  return nativeComponentName + "$" + jsComponentName.asString(rt).utf8(rt);
}

} // namespace reanimated::css
