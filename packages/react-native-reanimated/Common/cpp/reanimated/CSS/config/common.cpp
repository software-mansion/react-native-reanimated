#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/config/common.h>

namespace reanimated {

double getDuration(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "duration").asNumber();
}

EasingFunction getTimingFunction(jsi::Runtime &rt, const jsi::Object &config) {
  return createEasingFunction(rt, config.getProperty(rt, "timingFunction"));
}

double getDelay(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "delay").asNumber();
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
