#include <reanimated/CSS/configs/common.h>

#include <react/renderer/componentregistry/componentNameByReactViewName.h>

using facebook::react::componentNameByReactViewName;

namespace reanimated::css {

double getDuration(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "duration").asNumber();
}

double getDuration(const folly::dynamic &config) {
  return config.at("duration").asDouble();
}

EasingFunction getTimingFunction(jsi::Runtime &rt, const jsi::Object &config) {
  return createEasingFunction(rt, config.getProperty(rt, "timingFunction"));
}

EasingFunction getTimingFunction(const folly::dynamic &config) {
  return createEasingFunction(config.at("timingFunction"));
}

double getDelay(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "delay").asNumber();
}

double getDelay(const folly::dynamic &config) {
  return config.at("delay").asDouble();
}

std::pair<std::string, std::string> splitCompoundComponentName(const std::string &compoundComponentName) {
  const auto pos = compoundComponentName.find('$');
  if (pos == std::string::npos) {
    return {compoundComponentName, ""};
  }
  return {compoundComponentName.substr(0, pos), compoundComponentName.substr(pos + 1)};
}

} // namespace reanimated::css
