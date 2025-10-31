#pragma once

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
struct PlatformDepMethodsHolder {
  RequestRenderFunction requestRender;
#ifdef ANDROID
  PreserveMountedTagsFunction filterUnmountedTagsFunction;
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
};

} // namespace reanimated
