#pragma once

#include <reanimated/Tools/FeatureFlags.h>

namespace reanimated {

/// The static flag that gives layout animations the native route of this platform.
constexpr bool hasNativeLayoutRouteFlag() {
#ifdef ANDROID
  return StaticFeatureFlags::getFlag("ANDROID_NATIVE_LAYOUT_ANIMATIONS");
#else
  return StaticFeatureFlags::getFlag("IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION");
#endif
}

} // namespace reanimated
