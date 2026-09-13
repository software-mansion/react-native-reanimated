#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/core/transition/CSSPlatformTransitionBackend.h>
#include <reanimated/CSS/easing/EasingConfigs.h>
#include <reanimated/CSS/utils/platform.h>
#include <reanimated/CSS/utils/reversingShortening.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <memory>
#include <optional>
#include <string>
#include <unordered_map>

namespace reanimated::css {

using namespace facebook;
using namespace react;

/// A view's transition partition: which properties animate on the platform vs the
/// C++ loop. Owned per-view by CSSTransition; updated by the proxy on migrations.
struct CSSTransitionRouting {
  TransitionProperties platform;
  TransitionProperties loop;
};

/// Shared routing engine: per property it routes a view's CSS transition to the
/// platform or the C++ loop. Endpoints are parsed here, so a value the platform
/// can't express never crosses the seam. Interruption and reversal state is kept
/// here too, so a backend only starts and stops native animations. Per-view
/// routing state is passed in; without a backend every property stays on the loop.
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
      double timestamp);

  /// Re-routes pseudo-selector toggle diffs: a property the platform can no longer
  /// express migrates to the loop. Updates `routing`, returns the loop diffs.
  /// Only a property still pseudo-locked after the toggle needs its value held.
  PropertyValueDynamicDiffsMap processDynamicDiffs(
      Tag viewTag,
      const PropertyValueDynamicDiffsMap &propertyDiffs,
      const TransitionProperties &pseudoLockedProperties,
      CSSTransitionRouting &routing,
      bool allowPlatform,
      double timestamp);

  /// Cancels the native transition of every given property (teardown).
  void cancelAll(Tag viewTag, const TransitionProperties &properties);

 private:
  /// Per-property state of an in-flight native transition, kept for
  /// interruptions and reversals.
  struct ActiveTransition {
    /// Reversing-adjusted start value: what a later reversal has to target.
    std::optional<PlatformValue> adjustedStart;
    /// Where the timeline started, so getCurrentValue can retrace what it plays.
    std::optional<PlatformValue> startValue;
    PlatformValue adjustedEnd;
    ReversingState reversing;
    CSSTransitionPropertySettings settings;
  };

  bool canRoute(const std::string &propertyName, const EasingConfig &easing) const;
  /// A null `settings` marks the pseudo-selector toggle path, which reuses the
  /// settings stored by the last config apply.
  bool apply(
      Tag viewTag,
      const std::string &propertyName,
      const PlatformValue &fromValue,
      const PlatformValue &toValue,
      const CSSTransitionPropertySettings *settings,
      bool persistent,
      double timestamp);
  void remove(Tag viewTag, const std::string &propertyName);

  const ActiveTransition *activeTransitionFor(Tag viewTag, const std::string &propertyName) const;
  /// Retraced from the stored timeline: the value the native animation shows now.
  std::optional<PlatformValue> getCurrentValue(Tag viewTag, const std::string &propertyName, double timestamp) const;
  /// nullopt keeps the diff's own from-value, which the animation has painted past.
  std::optional<double> getResumeValue(Tag viewTag, const std::string &propertyName, double timestamp) const;

  std::shared_ptr<CSSPlatformTransitionBackend> backend_;
  std::unordered_map<Tag, std::unordered_map<std::string, ActiveTransition>> active_;
};

} // namespace reanimated::css
