#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingConfigs.h>
#include <reanimated/CSS/utils/platform.h>
#include <reanimated/CSS/utils/reversingShortening.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <functional>
#include <optional>
#include <string>
#include <unordered_map>
#include <variant>

namespace reanimated::css {

using namespace facebook;
using namespace react;

/// Starts the property's native animation; false falls back to the loop. The timeline
/// is already reversing-adjusted, so `startTimestampMs` can lie in the past (the backend
/// seeks) or in the future (the backend holds `fromValue` until then). `persistent` means
/// no committed style backs the target, so the backend must hold the value past the end.
using CSSStartTransitionFunction = std::function<bool(
    Tag viewTag,
    const std::string &propertyName,
    const PlatformValue &fromValue,
    const PlatformValue &toValue,
    double durationMs,
    double startTimestampMs,
    const EasingConfig &easing,
    bool persistent)>;
/// Cancels the property's native animation, leaving the last painted value on screen.
using CSSStopTransitionFunction = std::function<void(Tag viewTag, const std::string &propertyName)>;

/// A view's transition partition: which properties animate on the platform vs the
/// C++ loop. Owned per-view by CSSTransition; updated by the proxy on migrations.
struct CSSTransitionRouting {
  TransitionProperties platform;
  TransitionProperties loop;
};

/// Shared routing engine: per property it routes a view's CSS transition to the platform or
/// the C++ loop, and owns the timeline of everything it routed, so the reversing bookkeeping
/// the CSS spec requires lives here once for every backend. Endpoints are parsed here, so a
/// value the platform can't express never crosses the seam.
class CSSPlatformTransitionProxy {
 public:
  CSSPlatformTransitionProxy(CSSStartTransitionFunction startTransition, CSSStopTransitionFunction stopTransition);

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
  /// A transition the platform is playing. adjustedStart and the reversing snapshot
  /// handle interruptions; settings are reused by the pseudo-selector toggle path,
  /// which carries none of its own.
  struct ActiveTransition {
    /// Reversing-adjusted start value: what a later reversal has to target. A reversal
    /// resumes from the live value, so this is not where the animation started.
    std::optional<PlatformValue> adjustedStart;
    /// Where the animation started, so getCurrentValue can retrace what it plays.
    std::optional<PlatformValue> startValue;
    PlatformValue adjustedEnd;
    ReversingState reversing;
    CSSTransitionPropertySettings settings;
  };

  /// Whether the property routes natively for this easing. A platform missing either hook
  /// keeps every property on the loop, so nothing is started that cannot be cancelled.
  bool canRoute(const std::string &propertyName, const EasingConfig &easing) const;
  /// A null `settings` marks the pseudo-selector toggle path, which reuses whatever the
  /// last value-carrying config stored - a settings-only config does not re-apply, so those
  /// can be a revision behind. False when there is nothing stored to reuse.
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
  /// The value the platform shows now, retraced from the stored timeline rather than read
  /// back from the view, which only the UI thread may touch. nullopt after a non-reversing
  /// interruption, which resumed from the live value.
  std::optional<PlatformValue> getCurrentValue(Tag viewTag, const std::string &propertyName, double timestamp) const;
  /// nullopt keeps the diff's own from-value, which the animation has painted past.
  std::optional<double> getResumeValue(Tag viewTag, const std::string &propertyName, double timestamp) const;

  CSSStartTransitionFunction startTransition_;
  CSSStopTransitionFunction stopTransition_;
  /// viewTag -> propertyName -> timeline, for every property currently routed to the
  /// platform. Touched only from the thread that drives routing.
  std::unordered_map<Tag, std::unordered_map<std::string, ActiveTransition>> active_;
};

} // namespace reanimated::css
