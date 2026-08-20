#pragma once

#include <reanimated/CSS/easing/EasingConfigs.h>
#include <reanimated/CSS/utils/platform.h>
#include <reanimated/android/CSS/CSSPlatformEasings.h>

#include <react/renderer/core/ReactPrimitives.h>

#include <functional>
#include <memory>
#include <string>
#include <unordered_map>

namespace reanimated {

using namespace facebook::react;

/// ObjectAnimator backend for platform-routed CSS transitions. It only plays and cancels
/// what the shared routing engine hands it; the CSS reversing bookkeeping lives there.
/// Curves cross the JNI seam as interned ids, so this owns the reference each routed
/// property holds on its curve.
class CSSPlatformTransitions {
 public:
  /// False means the property falls back to the loop.
  using AnimateFunction = std::function<bool(
      int viewTag,
      int propertyId,
      double fromValue,
      double toValue,
      double durationMs,
      double startTimestampMs,
      int easingId,
      bool persistent)>;
  using RemoveFunction = std::function<void(int viewTag, int propertyId)>;

  CSSPlatformTransitions(AnimateFunction animate, RemoveFunction remove, std::shared_ptr<CSSPlatformEasings> easings);

  /// Plays the property on the view. `startTimestampMs` may lie in the past, which the
  /// player seeks to, or in the future, which it holds `fromValue` through. False when the
  /// platform cannot express the property or the player refuses the start.
  bool startTransition(
      Tag viewTag,
      const std::string &propertyName,
      const css::PlatformValue &fromValue,
      const css::PlatformValue &toValue,
      double durationMs,
      double startTimestampMs,
      const css::EasingConfig &easing,
      bool persistent);

  /// Cancels the property's animator, leaving the last painted frame on screen.
  void stopTransition(Tag viewTag, const std::string &propertyName);

 private:
  /// Takes a reference on the property's new curve and drops the one it replaces, in that
  /// order, so a retrigger with the same curve never falls to zero and rebuilds it.
  void replaceEasingId(Tag viewTag, const std::string &propertyName, int easingId);

  /// viewTag -> propertyName -> the interned curve the property currently holds.
  std::unordered_map<Tag, std::unordered_map<std::string, int>> easingIds_;
  std::shared_ptr<CSSPlatformEasings> easings_;
  AnimateFunction animate_;
  RemoveFunction remove_;
};

} // namespace reanimated
