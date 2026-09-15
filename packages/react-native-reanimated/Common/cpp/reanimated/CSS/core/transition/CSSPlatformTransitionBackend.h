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

/// The platform's native driver for CSS transitions. A platform supplies one
/// only when its native transitions are enabled, in the same place it builds the
/// rest of its PlatformDepMethodsHolder; without one every property runs on the
/// C++ loop, so the C++ side never reads a platform feature flag.
class CSSPlatformTransitionBackend {
 public:
  virtual ~CSSPlatformTransitionBackend() = default;

  /// Whether the property can animate natively for the given easing. Each
  /// backend routes its own subset of properties and needs an easing its
  /// interpolators can carry; everything else runs on the C++ loop.
  virtual bool canRoute(const std::string &propertyName, const EasingConfig &easing) const = 0;

  /// Animates a routed property natively; a false return falls back to the loop.
  /// `settings` is null on the pseudo-selector toggle path, where the backend reuses
  /// the settings captured at config-apply time. `persistent` means the target has no
  /// committed style behind it, so the backend must hold the value past the animation.
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
