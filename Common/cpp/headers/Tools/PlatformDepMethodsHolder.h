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
using ScrollToFunction = std::function<void(int, double, double, bool)>;
using MeasuringFunction =
    std::function<std::vector<std::pair<std::string, double>>(int)>;
using TimeProviderFunction = std::function<double(void)>;
using SetGestureStateFunction = std::function<void(int, int)>;

struct PlatformDepMethodsHolder {
  RequestRender requestRender;
  SynchronouslyUpdateUIPropsFunction synchronouslyUpdateUIPropsFunction;
  ScrollToFunction scrollToFunction;
  MeasuringFunction measuringFunction;
  TimeProviderFunction getCurrentTime;
  SetGestureStateFunction setGestureStateFunction;
};

} // namespace reanimated
