#pragma once

#include <reanimated/Tools/FeatureFlags.h>

#include <cstdint>

namespace reanimated {

/// The static flag that gives layout animations the native route of this platform.
constexpr bool hasNativeLayoutRouteFlag() {
#ifdef ANDROID
  return StaticFeatureFlags::getFlag("ANDROID_NATIVE_LAYOUT_ANIMATIONS");
#else
  return StaticFeatureFlags::getFlag("IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION");
#endif
}

/// Why layout keeps a start frame-driven before it has a build summary.
enum class NativeStartRefusal : uint8_t {
  /// The pull is not in the mount of its transaction.
  NoMountReport,
  /// The mount of the transaction does not put the entering view in a window.
  NotInWindow,
  /// The light node of the start is not the mapped node of its tag.
  NodeNotMapped,
  /// An exiting start of a view that is not exiting, or another start of an exiting view.
  ExitStateMismatch,
  /// The frame driver has an animation of the view.
  FrameDrivenState,
  HiddenBySharedTransition,
  BuilderThrew,
  /// The platform cannot play the change of the frame size of the view.
  SizeBeyondOnePixel,
  /// The view has too many layout requests in the last second (`LayoutRequestRates`).
  RequestRate,
};

} // namespace reanimated
