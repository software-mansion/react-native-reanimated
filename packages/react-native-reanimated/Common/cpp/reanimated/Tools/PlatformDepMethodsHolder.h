#pragma once

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <string>
#include <utility>
#include <vector>

using namespace facebook;
using namespace react;

namespace reanimated {

using UpdatePropsFunction =
    std::function<void(jsi::Runtime &rt, const jsi::Value &operations)>;
using ObtainPropFunction = std::function<jsi::Value(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper,
    const jsi::Value &propName)>;
using DispatchCommandFunction = std::function<void(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeValue,
    const jsi::Value &commandNameValue,
    const jsi::Value &argsValue)>;
using MeasureFunction = std::function<
    jsi::Value(jsi::Runtime &rt, const jsi::Value &shadowNodeValue)>;

using RequestRenderFunction =
    std::function<void(std::function<void(const double)>)>;
using SynchronouslyUpdateUIPropsFunction =
    std::function<void(const std::vector<int> &, const std::vector<double> &)>;
using GetAnimationTimestampFunction = std::function<double(void)>;

using ProgressLayoutAnimationFunction =
    std::function<void(jsi::Runtime &, int, jsi::Object)>;
using EndLayoutAnimationFunction = std::function<void(int, bool)>;

using RegisterSensorFunction =
    std::function<int(int, int, int, std::function<void(double[], int)>)>;
using UnregisterSensorFunction = std::function<void(int)>;
using SetGestureStateFunction = std::function<void(int, int)>;
using KeyboardEventSubscribeFunction =
    std::function<int(std::function<void(int, int)>, bool, bool)>;
using KeyboardEventUnsubscribeFunction = std::function<void(int)>;
using MaybeFlushUIUpdatesQueueFunction = std::function<void()>;

struct PlatformDepMethodsHolder {
  RequestRenderFunction requestRender;
#ifdef ANDROID
  SynchronouslyUpdateUIPropsFunction synchronouslyUpdateUIPropsFunction;
#endif // ANDROID
  GetAnimationTimestampFunction getAnimationTimestamp;
  RegisterSensorFunction registerSensor;
  UnregisterSensorFunction unregisterSensor;
  SetGestureStateFunction setGestureStateFunction;
  KeyboardEventSubscribeFunction subscribeForKeyboardEvents;
  KeyboardEventUnsubscribeFunction unsubscribeFromKeyboardEvents;
  MaybeFlushUIUpdatesQueueFunction maybeFlushUIUpdatesQueueFunction;
};

} // namespace reanimated
