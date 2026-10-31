#pragma once

#include <reanimated/CSS/core/transition/CSSPlatformTransitionBackend.h>
#include <reanimated/CSS/easing/EasingConfigs.h>
#include <reanimated/CSS/utils/platform.h>
#include <reanimated/android/CSS/CSSPlatformEasings.h>

#include <react/renderer/core/ReactPrimitives.h>

#include <functional>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>

namespace reanimated {

using namespace facebook::react;

/// Drives CSS transitions through an ObjectAnimator writing straight to the view.
class CSSPlatformTransitions : public css::CSSPlatformTransitionBackend {
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

  /// Every easing routes (a TimeInterpolator carries any curve); only properties
  /// with a Kotlin writer do.
  bool canRoute(const std::string &propertyName, const css::EasingConfig &easing) const override;

  std::optional<css::CSSPlatformTransitionRunId> startTransition(const css::CSSPlatformTransitionRun &run) override;

  void stopTransition(SurfaceId surfaceId, Tag viewTag, const std::string &propertyName) override;

 private:
  void replaceEasingId(Tag viewTag, const std::string &propertyName, int easingId);

  std::unordered_map<Tag, std::unordered_map<std::string, int>> easingIds_;
  css::CSSPlatformTransitionRunId nextRunId_{0};
  std::shared_ptr<CSSPlatformEasings> easings_;
  AnimateFunction animate_;
  RemoveFunction remove_;
};

} // namespace reanimated
