#pragma once

#include <jsi/jsi.h>

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/core/ReactPrimitives.h>
#else
#include <string>
#include <utility>
#include <vector>
#endif // RCT_NEW_ARCH_ENABLED

namespace reanimated {

#ifdef RCT_NEW_ARCH_ENABLED

using SynchronouslyUpdateUIPropsFunction = std::function<void(
    facebook::jsi::Runtime &rt,
    facebook::react::Tag tag,
    const facebook::jsi::Object &props)>;
using UpdatePropsFunction = std::function<
    void(facebook::jsi::Runtime &rt, const facebook::jsi::Value &operations)>;
using RemoveFromPropsRegistryFunction = std::function<
    void(facebook::jsi::Runtime &rt, const facebook::jsi::Value &viewTags)>;
using ObtainPropFunction = std::function<facebook::jsi::Value(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &shadowNodeWrapper,
    const facebook::jsi::Value &propName)>;
using DispatchCommandFunction = std::function<void(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &shadowNodeValue,
    const facebook::jsi::Value &commandNameValue,
    const facebook::jsi::Value &argsValue)>;
using MeasureFunction = std::function<facebook::jsi::Value(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &shadowNodeValue)>;

#else

using UpdatePropsFunction = std::function<
    void(facebook::jsi::Runtime &rt, const facebook::jsi::Value &operations)>;
using ScrollToFunction = std::function<void(int, double, double, bool)>;
using DispatchCommandFunction = std::function<void(
    facebook::jsi::Runtime &rt,
    const int viewTag,
    const facebook::jsi::Value &commandNameValue,
    const facebook::jsi::Value &argsValue)>;
using MeasureFunction =
    std::function<std::vector<std::pair<std::string, double>>(int)>;
using ObtainPropFunction = std::function<facebook::jsi::Value(
    facebook::jsi::Runtime &,
    const int,
    const facebook::jsi::Value &)>;

#endif // RCT_NEW_ARCH_ENABLED

using RequestRenderFunction = std::function<
    void(std::function<void(const double)>, facebook::jsi::Runtime &)>;
using GetAnimationTimestampFunction = std::function<double(void)>;

using ProgressLayoutAnimationFunction = std::function<
    void(facebook::jsi::Runtime &, int, facebook::jsi::Object, bool)>;
using EndLayoutAnimationFunction = std::function<void(int, bool)>;

using RegisterSensorFunction =
    std::function<int(int, int, int, std::function<void(double[], int)>)>;
using UnregisterSensorFunction = std::function<void(int)>;
using SetGestureStateFunction = std::function<void(int, int)>;
using ConfigurePropsFunction = std::function<void(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &uiProps,
    const facebook::jsi::Value &nativeProps)>;
using KeyboardEventSubscribeFunction =
    std::function<int(std::function<void(int, int)>, bool, bool)>;
using KeyboardEventUnsubscribeFunction = std::function<void(int)>;
using MaybeFlushUIUpdatesQueueFunction = std::function<void()>;

struct PlatformDepMethodsHolder {
  RequestRenderFunction requestRender;
#ifdef RCT_NEW_ARCH_ENABLED
  SynchronouslyUpdateUIPropsFunction synchronouslyUpdateUIPropsFunction;
#else
  UpdatePropsFunction updatePropsFunction;
  ScrollToFunction scrollToFunction;
  DispatchCommandFunction dispatchCommandFunction;
  MeasureFunction measureFunction;
  ConfigurePropsFunction configurePropsFunction;
  ObtainPropFunction obtainPropFunction;
#endif
  GetAnimationTimestampFunction getAnimationTimestamp;
  ProgressLayoutAnimationFunction progressLayoutAnimation;
  EndLayoutAnimationFunction endLayoutAnimation;
  RegisterSensorFunction registerSensor;
  UnregisterSensorFunction unregisterSensor;
  SetGestureStateFunction setGestureStateFunction;
  KeyboardEventSubscribeFunction subscribeForKeyboardEvents;
  KeyboardEventUnsubscribeFunction unsubscribeFromKeyboardEvents;
  MaybeFlushUIUpdatesQueueFunction maybeFlushUIUpdatesQueueFunction;
};

} // namespace reanimated
