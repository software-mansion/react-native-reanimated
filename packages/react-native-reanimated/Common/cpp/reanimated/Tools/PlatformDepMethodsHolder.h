#pragma once

#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>
#include <reanimated/PseudoStyles/PseudoSelector.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <react/renderer/core/ReactPrimitives.h>
#include <reanimated/CSS/core/CSSPlatformAnimationFactory.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

using namespace facebook;
using namespace react;

namespace reanimated {

using UpdatePropsFunction = std::function<void(jsi::Runtime &rt, const jsi::Value &operations)>;
using ObtainPropFunction =
    std::function<jsi::Value(jsi::Runtime &rt, const jsi::Value &shadowNodeWrapper, const jsi::Value &propName)>;
using DispatchCommandFunction = std::function<void(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeValue,
    const jsi::Value &commandNameValue,
    const jsi::Value &argsValue)>;
using MeasureFunction = std::function<jsi::Value(jsi::Runtime &rt, const jsi::Value &shadowNodeValue)>;

using RequestRenderFunction = std::function<void(std::function<void(const double)>)>;
#ifdef ANDROID
using SynchronouslyUpdateUIPropsFunction = std::function<void(const std::vector<int> &, const std::vector<double> &)>;
#elif __APPLE__
using SynchronouslyUpdateUIPropsFunction = std::function<void(const int, const folly::dynamic &)>;
#endif // ANDROID
using PreserveMountedTagsFunction = std::function<std::optional<std::unique_ptr<int[]>>(std::vector<int> &)>;
using GetAnimationTimestampFunction = std::function<double(void)>;

using ProgressLayoutAnimationFunction = std::function<void(jsi::Runtime &, int, jsi::Object)>;
using EndLayoutAnimationFunction = std::function<void(int, bool)>;

using RegisterSensorFunction = std::function<int(int, int, int, std::function<void(double[], int)>)>;
using UnregisterSensorFunction = std::function<void(int)>;
using SetGestureStateFunction = std::function<void(int, int)>;
using KeyboardEventSubscribeFunction = std::function<int(std::function<void(int, int)>, bool, bool)>;
using KeyboardEventUnsubscribeFunction = std::function<void(int)>;
using MaybeFlushUIUpdatesQueueFunction = std::function<void()>;

using ForceScreenSnapshotFunction = std::function<void(Tag tag)>;

// iOS-only. Shared Element Transitions mount their synthetic container views at the surface root.
// When the source/destination screen is a modal presented in its own UIViewController (RNSScreen
// stackPresentation modal/formSheet/pageSheet/fullScreenModal/transparentModal), that VC sits above
// the surface root, so a root-mounted container renders behind it. BeginModalMirror starts drawing a
// live MIRROR of the given container tag into a high-windowLevel overlay window above the modal (each
// frame copies the real container's rendered pixels + geometry) so the morph is visible. The real
// container view is never moved, so Fabric's unmount/cleanup is unaffected.
using BeginModalMirrorFunction = std::function<void(Tag)>;
// Tears down ALL active container mirrors and stops the per-frame copy. Called once from
// cleanupSharedTransitions when the transition ends. No-arg (ends all).
using EndModalMirrorsFunction = std::function<void()>;

using PlatformAttachPseudoSelectorFunction = std::function<void(Tag, PseudoSelector, std::function<void(bool)>)>;
using PlatformDetachPseudoSelectorFunction = std::function<void(Tag, PseudoSelector)>;

struct PlatformDepMethodsHolder {
  RequestRenderFunction requestRender;
#ifdef ANDROID
  PreserveMountedTagsFunction filterUnmountedTagsFunction;
#endif // ANDROID
#ifdef __APPLE__
  ForceScreenSnapshotFunction forceScreenSnapshotFunction;
  BeginModalMirrorFunction beginModalMirrorFunction;
  EndModalMirrorsFunction endModalMirrorsFunction;
#endif
  SynchronouslyUpdateUIPropsFunction synchronouslyUpdateUIPropsFunction;
  GetAnimationTimestampFunction getAnimationTimestamp;
  RegisterSensorFunction registerSensor;
  UnregisterSensorFunction unregisterSensor;
  SetGestureStateFunction setGestureStateFunction;
  KeyboardEventSubscribeFunction subscribeForKeyboardEvents;
  KeyboardEventUnsubscribeFunction unsubscribeFromKeyboardEvents;
  MaybeFlushUIUpdatesQueueFunction maybeFlushUIUpdatesQueueFunction;
  PlatformAttachPseudoSelectorFunction attachPseudoSelector;
  PlatformDetachPseudoSelectorFunction detachPseudoSelector;
  css::CSSCanRoutePropertyFunction cssCanRouteProperty;
  css::CSSApplyTransitionFunction cssApplyTransition;
  css::CSSRemoveTransitionFunction cssRemoveTransition;
  // Last so platform initializers that don't supply it (iOS, Android today)
  // can omit it and rely on value-init (= null shared_ptr).
  std::shared_ptr<css::CSSPlatformAnimationFactory> platformAnimationFactory;
};

} // namespace reanimated
