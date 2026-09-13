#pragma once

#include <reanimated/CSS/easing/EasingConfigs.h>
#include <reanimated/CSS/utils/platform.h>

#include <react/renderer/core/ReactPrimitives.h>

#include <string>

namespace reanimated::css {

using namespace facebook;
using namespace react;

/// Native driver for CSS transitions. A platform supplies one only when its
/// native transitions are enabled; without one every property runs on the C++ loop.
/// Interruption and reversal state lives in CSSPlatformTransitionProxy, so a
/// backend only starts and stops native animations.
class CSSPlatformTransitionBackend {
 public:
  virtual ~CSSPlatformTransitionBackend() = default;

  /// Whether the property can animate natively with the given easing.
  virtual bool canRoute(const std::string &propertyName, const EasingConfig &easing) const = 0;

  /// Starts a native transition. Returns false to fall back to the C++ loop.
  /// `startTimestampMs` is absolute and may be in the past or future. `persistent`
  /// means no committed style backs the target, so the value must be held past
  /// the animation.
  virtual bool startTransition(
      Tag viewTag,
      const std::string &propertyName,
      const PlatformValue &fromValue,
      const PlatformValue &toValue,
      double durationMs,
      double startTimestampMs,
      const EasingConfig &easing,
      bool persistent) = 0;

  /// Cancels the property's native transition.
  virtual void stopTransition(Tag viewTag, const std::string &propertyName) = 0;
};

} // namespace reanimated::css
