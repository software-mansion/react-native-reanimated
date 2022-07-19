#pragma once

#include <jsi/jsi.h>

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/core/ReactPrimitives.h>
#endif

#include <string>
#include <utility>
#include <vector>

using namespace facebook;

#ifdef RCT_NEW_ARCH_ENABLED
using namespace react;
#endif

namespace reanimated {

#ifdef RCT_NEW_ARCH_ENABLED

using SynchronouslyUpdateUIPropsFunction =
    std::function<void(jsi::Runtime &rt, Tag tag, const jsi::Value &props)>;
using UpdatePropsFunction = std::function<void(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeValue,
    const jsi::Value &props)>;
using RemoveShadowNodeFromRegistryFunction =
    std::function<void(jsi::Runtime &rt, const jsi::Value &shadowNodeValue)>;
using DispatchCommandFunction = std::function<void(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeValue,
    const jsi::Value &commandNameValue,
    const jsi::Value &argsValue)>;
using MeasureFunction = std::function<
    jsi::Value(jsi::Runtime &rt, const jsi::Value &shadowNodeValue)>;

#else

using UpdatePropsFunction = std::function<void(
    jsi::Runtime &rt,
    int viewTag,
    const jsi::Value &viewName,
    const jsi::Object &object)>;
using ScrollToFunction = std::function<void(int, double, double, bool)>;
using MeasureFunction =
    std::function<std::vector<std::pair<std::string, double>>(int)>;

#endif // RCT_NEW_ARCH_ENABLED

using RequestRender =
    std::function<void(std::function<void(double)>, jsi::Runtime &rt)>;
using TimeProviderFunction = std::function<double(void)>;

using RegisterSensorFunction =
    std::function<int(int, int, std::function<void(double[])>)>;
using UnregisterSensorFunction = std::function<void(int)>;
using SetGestureStateFunction = std::function<void(int, int)>;
using ConfigurePropsFunction = std::function<void(
    jsi::Runtime &rt,
    const jsi::Value &uiProps,
    const jsi::Value &nativeProps)>;

struct PlatformDepMethodsHolder {
  RequestRender requestRender;
#ifdef RCT_NEW_ARCH_ENABLED
  SynchronouslyUpdateUIPropsFunction synchronouslyUpdateUIPropsFunction;
#else
  UpdatePropsFunction updatePropsFunction;
  ScrollToFunction scrollToFunction;
  MeasureFunction measureFunction;
  ConfigurePropsFunction configurePropsFunction;
#endif
  TimeProviderFunction getCurrentTime;
  RegisterSensorFunction registerSensor;
  UnregisterSensorFunction unregisterSensor;
  SetGestureStateFunction setGestureStateFunction;
};

} // namespace reanimated
