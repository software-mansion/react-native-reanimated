#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingConfigs.h>
#include <reanimated/CSS/utils/platform.h>

#include <react/renderer/core/ReactPrimitives.h>

#include <optional>
#include <string>

namespace reanimated::css {

using namespace facebook;
using namespace react;

/// Native driver for CSS transitions. A platform supplies one only when its
/// native transitions are enabled; without one every property runs on the C++ loop.
class CSSPlatformTransitionBackend {
 public:
  virtual ~CSSPlatformTransitionBackend() = default;

  /// Whether the property can animate natively with the given easing.
  virtual bool canRoute(const std::string &propertyName, const EasingConfig &easing) const = 0;

  /// False falls back to the loop. `settings` is null on the pseudo-selector toggle
  /// path (reuse the ones captured at config apply). `persistent` means no committed
  /// style backs the target, so the value must be held past the animation.
  virtual bool applyTransition(
      Tag viewTag,
      const std::string &propertyName,
      const PlatformValue &fromValue,
      const PlatformValue &toValue,
      const CSSTransitionPropertySettings *settings,
      bool persistent,
      double timestamp) = 0;

  /// Cancels the property's native transition and drops its platform-side state.
  virtual void removeTransition(Tag viewTag, const std::string &propertyName) = 0;

  /// The value the platform animation currently shows, so a demotion can resume from it.
  virtual std::optional<PlatformValue> getCurrentValue(Tag viewTag, const std::string &propertyName, double timestamp)
      const = 0;
};

} // namespace reanimated::css
