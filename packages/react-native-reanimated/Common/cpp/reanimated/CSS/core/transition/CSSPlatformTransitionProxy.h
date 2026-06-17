#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingConfigs.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/CSS/utils/reversingShortening.h>
#include <reanimated/CSS/utils/transformAnimation.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <react/renderer/core/ReactPrimitives.h>
#include <react/renderer/core/ShadowNode.h>

#include <functional>
#include <memory>
#include <string>
#include <unordered_map>

namespace reanimated::css {

using namespace facebook;
using namespace react;

/// Whether the platform can animate the property natively for the given easing.
using CSSCanRoutePropertyFunction = std::function<bool(const std::string &propertyName, const EasingConfig &easing)>;
/// Animates a routed SCALAR property natively; a false (no-op) return means the
/// platform can't express the value, so it falls back to the loop. The jsi
/// overload is the config path (carries a runtime + settings); the folly
/// overload, the toggle path. Transform never goes through these hooks - its plan
/// is built in common C++ and handed to the platform via CSSAnimateTransformFunction.
using CSSApplyTransitionJSIFunction = std::function<bool(
    jsi::Runtime &rt,
    Tag viewTag,
    const std::string &propertyName,
    const jsi::Value &fromValue,
    const jsi::Value &toValue,
    const CSSTransitionPropertySettings &settings,
    double timestamp)>;
using CSSApplyTransitionDynamicFunction = std::function<
    bool(Tag viewTag, const std::string &propertyName, const folly::dynamic &fromValue, const folly::dynamic &toValue, double timestamp)>;
/// Cancels the property's native transition and drops its platform-side state.
using CSSRemoveTransitionFunction = std::function<void(Tag viewTag, const std::string &propertyName)>;
/// Drives a finished transform plan through Core Animation. The plan, timing and
/// easing are fully computed in common C++; the platform only orchestrates CA.
using CSSAnimateTransformFunction = std::function<
    void(Tag viewTag, const TransformAnimationPlan &plan, double durationMs, double startTimeMs, const EasingConfig &easing)>;

/// A view's transition partition: which properties animate on the platform vs the
/// C++ loop. Owned per-view by CSSTransition; updated by the proxy on migrations.
struct CSSTransitionRouting {
  TransitionProperties platform;
  TransitionProperties loop;
};

/// Shared routing engine: per property it routes a view's CSS transition to the
/// platform (animated natively via the hooks above) or the C++ loop. For scalars
/// it forwards the raw JS source to the platform. For transform it owns the value
/// model (endpoints, reversal bookkeeping, in-flight sampling) and hands the
/// platform a finished plan. Per-view routing state is passed in; an absent hook
/// keeps that property on the loop.
class CSSPlatformTransitionProxy {
 public:
  CSSPlatformTransitionProxy(
      CSSCanRoutePropertyFunction canRoute,
      CSSApplyTransitionJSIFunction applyJSI,
      CSSApplyTransitionDynamicFunction applyDynamic,
      CSSRemoveTransitionFunction removeTransition,
      CSSAnimateTransformFunction animateTransform);

  /// Routes the config between platform and loop, updating `routing` and returning
  /// the loop-routed remainder to run. shadowNode + viewStylesRepository drive the
  /// native plan for view-dependent properties; `lastUpdates` is updated in place
  /// with the in-flight values of properties migrating platform -> loop, so the
  /// loop run continues without a visual jump.
  CSSTransitionConfig processConfig(
      jsi::Runtime &rt,
      Tag viewTag,
      const CSSTransitionConfig &config,
      CSSTransitionRouting &routing,
      double timestamp,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      folly::dynamic &lastUpdates) const;

  /// Re-routes pseudo-selector toggle diffs: a property the platform can no longer
  /// express migrates to the loop. Updates `routing`, returns the loop diffs, and
  /// records in-flight migration values into `lastUpdates`.
  PropertyValueDynamicDiffsMap processDynamicDiffs(
      Tag viewTag,
      const PropertyValueDynamicDiffsMap &propertyDiffs,
      CSSTransitionRouting &routing,
      double timestamp,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      folly::dynamic &lastUpdates) const;

  /// The native transition's current target value for the property (operations
  /// array for transform), or null. Forwarded to the registry's prune/pin logic.
  folly::dynamic getTargetValue(Tag viewTag, const std::string &propertyName) const;

  /// Cancels the native transition of every given property (teardown).
  void cancelAll(Tag viewTag, const TransitionProperties &properties) const;

 private:
  /// Per-property transform transition state, owned in common C++ (transform is
  /// not a PlatformValue). fromDynamic/toDynamic are the raw endpoints the plan
  /// was sampled from (kept for in-flight re-derivation); `reversing` drives
  /// reverse-shortening on interruption; `settings` are reused on the runtime-free
  /// toggle path (which carries no settings of its own); componentName is captured
  /// for plan/value re-derivation. adjustedStart is the reversal-bookkeeping start.
  struct TransformTransitionState {
    folly::dynamic adjustedStart;
    folly::dynamic fromDynamic;
    folly::dynamic toDynamic;
    ReversingState reversing;
    CSSTransitionPropertySettings settings;
    std::string componentName;
  };

  /// The active transform transition for the tag/property, or nullptr.
  TransformTransitionState *findTransformState(Tag viewTag, const std::string &propertyName) const;

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
  /// Builds and drives a transform transition from raw dynamic endpoints,
  /// recording the per-transition state. Returns false (= run on the loop) when
  /// the value is not natively expressible. Mirrors the scalar apply() return
  /// contract.
  bool applyTransform(
      Tag viewTag,
      const folly::dynamic &fromValue,
      const folly::dynamic &toValue,
      const CSSTransitionPropertySettings &settings,
      double timestamp,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const folly::dynamic &lastUpdates) const;
  void remove(Tag viewTag, const std::string &propertyName) const;
  /// Captures the in-flight value of a property about to migrate platform -> loop
  /// into `lastUpdates`, then cancels the native transition. shadowNode + repo are
  /// needed to re-derive an in-flight transform value with the loop's interpolation.
  void migrateToLoop(
      Tag viewTag,
      const std::string &propertyName,
      double timestamp,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      folly::dynamic &lastUpdates) const;

  CSSCanRoutePropertyFunction canRoute_;
  CSSApplyTransitionJSIFunction applyJSI_;
  CSSApplyTransitionDynamicFunction applyDynamic_;
  CSSRemoveTransitionFunction removeTransition_;
  CSSAnimateTransformFunction animateTransform_;

  // viewTag -> propertyName -> transform state. Only "transform" is stored here;
  // scalars keep no common value state (they migrate via the CALayer presentation
  // layer on the platform side). mutable: the public apply/migrate path is const.
  mutable std::unordered_map<Tag, std::unordered_map<std::string, TransformTransitionState>> transformStates_;
};

} // namespace reanimated::css
