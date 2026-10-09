#pragma once

#include <reanimated/CSS/core/CSSPlatformAnimationFactory.h>
#include <reanimated/CSS/core/transition/CSSPlatformTransitionBackend.h>
#include <reanimated/PseudoStyles/PseudoSelector.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <react/renderer/core/Props.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <memory>
#include <optional>
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

using IsSensorAvailableFunction = std::function<bool(int)>;
using RegisterSensorFunction = std::function<int(int, int, int, std::function<void(double[], int)>)>;
using UnregisterSensorFunction = std::function<void(int)>;
using SetGestureStateFunction = std::function<void(int, int)>;
using KeyboardEventSubscribeFunction = std::function<int(std::function<void(int, int)>, bool, bool)>;
using KeyboardEventUnsubscribeFunction = std::function<void(int)>;
using MaybeFlushUIUpdatesQueueFunction = std::function<void()>;

using ForceScreenSnapshotFunction = std::function<bool(Tag tag)>;
using ReadMountedViewPropsFunction = std::function<Props::Shared(Tag tag)>;

// A view is mounted while it is attached to the window. The frame is in points, relative to the parent and without
// transforms.
struct MountedViewProps {
  double x;
  double y;
  double width;
  double height;
  double opacity;
};
using ObtainMountedViewPropsFunction = std::function<std::optional<MountedViewProps>(Tag tag)>;

using PlatformAttachPseudoSelectorFunction = std::function<void(Tag, PseudoSelector, std::function<void(bool)>)>;
using PlatformDetachPseudoSelectorFunction = std::function<void(Tag, PseudoSelector)>;

struct PlatformDepMethodsHolder {
  RequestRenderFunction requestRender;
#ifdef ANDROID
  PreserveMountedTagsFunction filterUnmountedTagsFunction;
#endif // ANDROID
#ifdef __APPLE__
  ForceScreenSnapshotFunction forceScreenSnapshotFunction;
  ReadMountedViewPropsFunction readMountedViewPropsFunction;
#endif
  SynchronouslyUpdateUIPropsFunction synchronouslyUpdateUIPropsFunction;
  GetAnimationTimestampFunction getAnimationTimestamp;
  IsSensorAvailableFunction isSensorAvailable;
  RegisterSensorFunction registerSensor;
  UnregisterSensorFunction unregisterSensor;
  SetGestureStateFunction setGestureStateFunction;
  KeyboardEventSubscribeFunction subscribeForKeyboardEvents;
  KeyboardEventUnsubscribeFunction unsubscribeFromKeyboardEvents;
  MaybeFlushUIUpdatesQueueFunction maybeFlushUIUpdatesQueueFunction;
  PlatformAttachPseudoSelectorFunction attachPseudoSelector;
  PlatformDetachPseudoSelectorFunction detachPseudoSelector;
  ObtainMountedViewPropsFunction obtainMountedViewProps;
  // Optional and last, so a platform without them just omits them; null keeps
  // CSS transitions and animations on the C++ loop.
  std::shared_ptr<css::CSSPlatformTransitionBackend> platformTransitionBackend;
  std::shared_ptr<css::CSSPlatformAnimationFactory> platformAnimationFactory;
};

} // namespace reanimated
