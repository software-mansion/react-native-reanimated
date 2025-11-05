#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

namespace reanimated::css {

double getDuration(jsi::Runtime &rt, const jsi::Object &config);

EasingFunction getTimingFunction(jsi::Runtime &rt, const jsi::Object &config);

double getDelay(jsi::Runtime &rt, const jsi::Object &config);

} // namespace reanimated::css
