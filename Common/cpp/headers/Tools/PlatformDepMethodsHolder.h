#pragma once

#include <jsi/jsi.h>
#include <stdio.h>
#include <string>
#include <utility>
#include <vector>

#include <react/renderer/core/ReactPrimitives.h>

using namespace facebook;
using namespace react;

namespace reanimated {

using SynchronouslyUpdateUIPropsFunction =
    std::function<void(jsi::Runtime &rt, Tag tag, const jsi::Value &props)>;

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
  SynchronouslyUpdateUIPropsFunction synchronouslyUpdateUIPropsFunction;
  TimeProviderFunction getCurrentTime;
  RegisterSensorFunction registerSensor;
  UnregisterSensorFunction unregisterSensor;
  SetGestureStateFunction setGestureStateFunction;
  ConfigurePropsFunction configurePropsFunction;
};

} // namespace reanimated
