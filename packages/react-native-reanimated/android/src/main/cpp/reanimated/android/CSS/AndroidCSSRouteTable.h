#pragma once

#include <reanimated/CSS/core/transition/CSSHostTransitionBackend.h>

#include <functional>

namespace reanimated::css {

CSSPlatformRouteTable makeAndroidCSSRouteTable(int apiLevel, std::function<bool()> animatorsEnabled);

} // namespace reanimated::css
