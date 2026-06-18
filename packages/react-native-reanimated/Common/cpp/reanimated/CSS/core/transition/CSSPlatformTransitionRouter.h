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
#include <string>
#include <unordered_map>

namespace reanimated::css {

using namespace facebook;
using namespace react;

/// Animates a property natively to its parsed target value over the given window.
/// The router does the parsing, routing, and reverse-shortening; the platform only
/// drives the native animation. An absent hook keeps every property on the loop.
using CSSApplyPlatformTransitionFunction = std::function<void(
    Tag viewTag,
    const std::string &propertyName,
    const PlatformValue &fromValue,
    const PlatformValue &toValue,
    double durationMs,
    double startTimeMs,
    const EasingConfig &easing)>;
/// Cancels the property's native transition.
using CSSRemoveTransitionFunction = std::function<void(Tag viewTag, const std::string &propertyName)>;

/// A view's transition partition: which properties animate on the platform vs the
/// C++ loop. Owned per-view by CSSTransition; updated by the router on migrations.
struct CSSTransitionRouting {
  TransitionProperties platform;
  TransitionProperties loop;
};

/// Shared routing engine: per property it routes a view's CSS transition to the
/// platform or to the C++ loop. For platform-routed properties it parses the JS
/// endpoints into native values, reverse-shortens interruptions, and owns the
/// in-flight native transition state per view; the platform hook only animates.
/// A property that can't be expressed natively migrates to the loop.
class CSSPlatformTransitionRouter {
 public:
  CSSPlatformTransitionRouter(
      CSSApplyPlatformTransitionFunction applyTransition,
      CSSRemoveTransitionFunction removeTransition);

  /// Routes the config between platform and loop, updating `routing` and returning
  /// the loop-routed remainder to run.
  CSSTransitionConfig processConfig(
      jsi::Runtime &rt,
      Tag viewTag,
      const CSSTransitionConfig &config,
      CSSTransitionRouting &routing,
      double timestamp) const;

  /// Re-routes pseudo-selector toggle diffs: a property the platform can no longer
  /// express migrates to the loop. Updates `routing`, returns the loop diffs.
  PropertyValueDynamicDiffsMap processDynamicDiffs(
      Tag viewTag,
      const PropertyValueDynamicDiffsMap &propertyDiffs,
      CSSTransitionRouting &routing,
      double timestamp) const;

  /// Cancels the native transition of every given property (teardown).
  void cancelAll(Tag viewTag, const TransitionProperties &properties) const;

 private:
  /// In-flight native transition for one property. adjustedStart/adjustedEnd and
  /// the reversing snapshot drive interruption handling; settings are reused by
  /// the toggle path, which carries none of its own.
  struct ActiveTransition {
    PlatformValue adjustedStart;
    PlatformValue adjustedEnd;
    ReversingState reversing;
    CSSTransitionPropertySettings settings;
  };

  /// Reverse-shortens against any in-flight transition, animates natively, and
  /// records the new active state. fromValue/toValue are already parsed.
  void applyPlatform(
      Tag viewTag,
      const std::string &propertyName,
      const PlatformValue &fromValue,
      const PlatformValue &toValue,
      const CSSTransitionPropertySettings &settings,
      double timestamp) const;
  void remove(Tag viewTag, const std::string &propertyName) const;

  CSSApplyPlatformTransitionFunction applyTransition_;
  CSSRemoveTransitionFunction removeTransition_;

  // viewTag -> propertyName -> active transition. Accessed only on the thread that
  // drives routing.
  mutable std::unordered_map<Tag, std::unordered_map<std::string, ActiveTransition>> activeTransitions_;
};

} // namespace reanimated::css
