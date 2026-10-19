#pragma once

#include <reanimated/CSS/core/transition/CSSPlatformTransitionBackend.h>
#include <reanimated/NativeAnimations/NativeAnimationHost.h>

#include <functional>
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated::css {

struct CSSPlatformRouteTable {
  std::unordered_map<std::string, native_animation::AnimationTarget> targets;
  std::vector<native_animation::AnimationTimingKind> timingKinds;
  /// Read at each start. Empty when the platform can always play.
  std::function<bool()> isAvailable;
};

/// Plays CSS transitions through the shared native animation host.
std::shared_ptr<CSSPlatformTransitionBackend> makeCSSHostTransitionBackend(
    const std::shared_ptr<native_animation::NativeAnimationHost> &host,
    CSSPlatformRouteTable routeTable);

} // namespace reanimated::css
