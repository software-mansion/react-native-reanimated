#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

#include <folly/dynamic.h>

namespace reanimated::css {

double getDuration(const folly::dynamic &config);

EasingFunction getTimingFunction(const folly::dynamic &config);

double getDelay(const folly::dynamic &config);

} // namespace reanimated::css
