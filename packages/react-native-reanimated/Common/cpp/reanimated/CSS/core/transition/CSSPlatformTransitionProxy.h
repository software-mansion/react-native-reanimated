#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingConfigs.h>
#include <reanimated/CSS/utils/platform.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <functional>
#include <string>

namespace reanimated::css {

using namespace facebook;
using namespace react;

/// Whether the platform can animate the property natively for the given easing.
using CSSCanRoutePropertyFunction = std::function<bool(const std::string &propertyName, const EasingConfig &easing)>;
/// Animates a routed property natively; a false return falls back to the loop.
/// `settings` is null on the pseudo-selector toggle path, where the backend reuses
/// the settings captured at config-apply time. `persistent` means the target has no
/// committed style behind it, so the backend must hold the value past the animation.
using CSSApplyTransitionFunction = std::function<bool(
    Tag viewTag,
    const std::string &propertyName,
    const PlatformValue &fromValue,
    const PlatformValue &toValue,
    const CSSTransitionPropertySettings *settings,
    bool persistent,
    double timestamp)>;
/// Cancels the property's native transition and drops its platform-side state.
using CSSRemoveTransitionFunction = std::function<void(Tag viewTag, const std::string &propertyName)>;
/// The value the platform animation currently shows, so a demotion can resume from it.
using CSSGetPlatformValueFunction =
    std::function<std::optional<PlatformValue>(Tag viewTag, const std::string &propertyName, double timestamp)>;

/// A view's transition partition: which properties animate on the platform vs the
/// C++ loop. Owned per-view by CSSTransition; updated by the proxy on migrations.
struct CSSTransitionRouting {
  TransitionProperties platform;
  TransitionProperties loop;
};

/// Stateless, shared routing engine: per property it routes a view's CSS transition
/// to the platform or the C++ loop. Endpoints are parsed here, so a value the
/// platform can't express never crosses the seam. Per-view routing state is passed
/// in; an absent hook keeps that property on the loop.
class CSSPlatformTransitionProxy {
 public:
  CSSPlatformTransitionProxy(
      CSSCanRoutePropertyFunction canRoute,
      CSSApplyTransitionFunction applyTransition,
      CSSRemoveTransitionFunction removeTransition,
      CSSGetPlatformValueFunction getPlatformValue);

  /// Routes the config between platform and loop, updating `routing` and returning
  /// the loop-routed remainder to run.
  CSSTransitionConfig processConfig(
      jsi::Runtime &rt,
      Tag viewTag,
      const CSSTransitionConfig &config,
      CSSTransitionRouting &routing,
      bool allowPlatform,
      double timestamp) const;

  /// Re-routes pseudo-selector toggle diffs: a property the platform can no longer
  /// express migrates to the loop. Updates `routing`, returns the loop diffs.
  /// Only a property still pseudo-locked after the toggle needs its value held.
  PropertyValueDynamicDiffsMap processDynamicDiffs(
      Tag viewTag,
      const PropertyValueDynamicDiffsMap &propertyDiffs,
      const TransitionProperties &pseudoLockedProperties,
      CSSTransitionRouting &routing,
      bool allowPlatform,
      double timestamp) const;

  /// Cancels the native transition of every given property (teardown).
  void cancelAll(Tag viewTag, const TransitionProperties &properties) const;

 private:
  bool canRoute(const std::string &propertyName, const EasingConfig &easing) const;
  bool apply(
      Tag viewTag,
      const std::string &propertyName,
      const PlatformValue &fromValue,
      const PlatformValue &toValue,
      const CSSTransitionPropertySettings *settings,
      bool persistent,
      double timestamp) const;
  void remove(Tag viewTag, const std::string &propertyName) const;
  /// nullopt keeps the diff's own from-value, which the animation has painted past.
  std::optional<double> getResumeValue(Tag viewTag, const std::string &propertyName, double timestamp) const;

  CSSCanRoutePropertyFunction canRoute_;
  CSSApplyTransitionFunction applyTransition_;
  CSSRemoveTransitionFunction removeTransition_;
  CSSGetPlatformValueFunction getPlatformValue_;
};

} // namespace reanimated::css
