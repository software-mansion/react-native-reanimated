#include <reanimated/CSS/config/common.h>

namespace reanimated::css {

double getDuration(const folly::dynamic &config) {
  return config["duration"].asDouble();
}

EasingFunction getTimingFunction(const folly::dynamic &config) {
  return createEasingFunction(config["timingFunction"]);
}

double getDelay(const folly::dynamic &config) {
  return config["delay"].asDouble();
}

} // namespace reanimated::css
