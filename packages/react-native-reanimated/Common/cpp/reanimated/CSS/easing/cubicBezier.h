#pragma once

#include <reanimated/CSS/common/definitions.h>

namespace reanimated::css {

EasingFunction cubicBezier(double x1, double y1, double x2, double y2);
EasingFunction cubicBezier(jsi::Runtime &rt, const jsi::Object &easingConfig);

} // namespace reanimated::css
