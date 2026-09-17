#pragma once

#include <reanimated/CSS/core/CSSPlatformAnimationFactory.h>
#include <reanimated/CSS/core/transition/CSSPlatformTransitionBackend.h>
#include <reanimated/PseudoStyles/PseudoSelector.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <react/renderer/core/ReactPrimitives.h>

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
#ifdef ANDROID
using RelayoutTextViewsFunction = std::function<void(const std::vector<int> &)>;
#endif // ANDROID
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

using PlatformAttachPseudoSelectorFunction = std::function<void(Tag, PseudoSelector, std::function<void(bool)>)>;
using PlatformDetachPseudoSelectorFunction = std::function<void(Tag, PseudoSelector)>;

struct PlatformDepMethodsHolder {
  RequestRenderFunction requestRender;
#ifdef ANDROID
  PreserveMountedTagsFunction filterUnmountedTagsFunction;
  RelayoutTextViewsFunction relayoutTextViewsFunction;
#endif // ANDROID
#ifdef __APPLE__
  ForceScreenSnapshotFunction forceScreenSnapshotFunction;
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
  // Optional and last, so a platform without them just omits them; null keeps
  // CSS transitions and animations on the C++ loop.
  std::shared_ptr<css::CSSPlatformTransitionBackend> platformTransitionBackend;
  std::shared_ptr<css::CSSPlatformAnimationFactory> platformAnimationFactory;
};

} // namespace reanimated
