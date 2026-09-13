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

/// Android ObjectAnimator backend for CSS transitions.
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

  /// Returns false if the property cannot be animated natively.
  bool startTransition(
      Tag viewTag,
      const std::string &propertyName,
      const css::PlatformValue &fromValue,
      const css::PlatformValue &toValue,
      double durationMs,
      double startTimestampMs,
      const css::EasingConfig &easing,
      bool persistent);

  void stopTransition(Tag viewTag, const std::string &propertyName);

 private:
  void replaceEasingId(Tag viewTag, const std::string &propertyName, int easingId);

  std::unordered_map<Tag, std::unordered_map<std::string, int>> easingIds_;
  std::shared_ptr<CSSPlatformEasings> easings_;
  AnimateFunction animate_;
  RemoveFunction remove_;
};

} // namespace reanimated
