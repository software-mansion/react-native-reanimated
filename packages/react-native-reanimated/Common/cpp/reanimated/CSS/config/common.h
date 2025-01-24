#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/easing/EasingFunctions.h>

namespace reanimated {

double getDuration(jsi::Runtime &rt, const jsi::Object &config);

EasingFunction getTimingFunction(jsi::Runtime &rt, const jsi::Object &config);

double getDelay(jsi::Runtime &rt, const jsi::Object &config);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
