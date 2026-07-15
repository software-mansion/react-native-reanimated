#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingConfigs.h>

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
/// Animates a routed property natively; a false (no-op) return means the platform
/// can't express the value, so it falls back to the loop. The jsi overload is the
/// config path (carries a runtime + settings); the folly overload, the toggle path.
using CSSApplyTransitionJSIFunction = std::function<bool(
    jsi::Runtime &rt,
    Tag viewTag,
    const std::string &propertyName,
    const jsi::Value &fromValue,
    const jsi::Value &toValue,
    const CSSTransitionPropertySettings &settings,
    double timestamp)>;
using CSSApplyTransitionDynamicFunction = std::function<bool(
    Tag viewTag,
    const std::string &propertyName,
    const folly::dynamic &fromValue,
    const folly::dynamic &toValue,
    double timestamp)>;
/// Cancels the property's native transition and drops its platform-side state.
using CSSRemoveTransitionFunction = std::function<void(Tag viewTag, const std::string &propertyName)>;

/// A view's transition partition: which properties animate on the platform vs the
/// C++ loop. Owned per-view by CSSTransition; updated by the proxy on migrations.
struct CSSTransitionRouting {
  TransitionProperties platform;
  TransitionProperties loop;
};

/// Stateless, shared routing engine: per property it routes a view's CSS transition
/// to the platform (animated natively via the hooks above) or the C++ loop, never
/// seeing the value - it forwards the raw JS source to the platform. Per-view routing
/// state is passed in; an absent hook keeps that property on the loop.
class CSSPlatformTransitionProxy {
 public:
  CSSPlatformTransitionProxy(
      CSSCanRoutePropertyFunction canRoute,
      CSSApplyTransitionJSIFunction applyJSI,
      CSSApplyTransitionDynamicFunction applyDynamic,
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
  bool canRoute(const std::string &propertyName, const EasingConfig &easing) const;
  bool apply(
      jsi::Runtime &rt,
      Tag viewTag,
      const std::string &propertyName,
      const jsi::Value &fromValue,
      const jsi::Value &toValue,
      const CSSTransitionPropertySettings &settings,
      double timestamp) const;
  bool apply(
      Tag viewTag,
      const std::string &propertyName,
      const folly::dynamic &fromValue,
      const folly::dynamic &toValue,
      double timestamp) const;
  void remove(Tag viewTag, const std::string &propertyName) const;

  CSSCanRoutePropertyFunction canRoute_;
  CSSApplyTransitionJSIFunction applyJSI_;
  CSSApplyTransitionDynamicFunction applyDynamic_;
  CSSRemoveTransitionFunction removeTransition_;
};

} // namespace reanimated::css
