#include <reanimated/CSS/config/common.h>

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

} // namespace reanimated::css
