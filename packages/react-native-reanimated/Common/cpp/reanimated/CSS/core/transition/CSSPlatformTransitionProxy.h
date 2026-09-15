#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/core/transition/CSSPlatformTransitionBackend.h>
#include <reanimated/CSS/easing/EasingConfigs.h>
#include <reanimated/CSS/utils/platform.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <memory>
#include <optional>
#include <string>

namespace reanimated::css {

using namespace facebook;
using namespace react;

/// A view's transition partition: which properties animate on the platform vs the
/// C++ loop. Owned per-view by CSSTransition; updated by the proxy on migrations.
struct CSSTransitionRouting {
  TransitionProperties platform;
  TransitionProperties loop;
};

/// Stateless, shared routing engine: per property it routes a view's CSS transition
/// to the platform or the C++ loop. Endpoints are parsed here, so a value the
/// platform can't express never crosses the seam. Per-view routing state is passed
/// in; without a backend every property stays on the loop.
class CSSPlatformTransitionProxy {
 public:
  explicit CSSPlatformTransitionProxy(std::shared_ptr<CSSPlatformTransitionBackend> backend);

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

  std::shared_ptr<CSSPlatformTransitionBackend> backend_;
};

} // namespace reanimated::css
