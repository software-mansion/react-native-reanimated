#pragma once

#include <stdio.h>
#include <jsi/jsi.h>

using namespace facebook;

namespace reanimated
{

using UpdaterFunction = std::function<void(jsi::Runtime &rt, int viewTag, const jsi::Value &viewName, const jsi::Object &object)>;
using RequestRender = std::function<void(std::function<void(double)>, jsi::Runtime &rt)>;
using ScrollToFunction = std::function<void(int, double, double, bool)>;
using MeasuringFunction = std::function<std::vector<std::pair<std::string, double>>(int)>;
using TimeProviderFunction = std::function<double(void)>;
using GetSensorDataFunction = std::function<std::vector<std::pair<std::string, double>>(int)>;

using RegisterSensorFunction = std::function<int(int, int, std::function<void(double)>)>;
using RejectSensorFunction = std::function<void(int)>;

struct PlatformDepMethodsHolder {
  RequestRender requestRender;
  UpdaterFunction updaterFunction;
  ScrollToFunction scrollToFunction;
  MeasuringFunction measuringFunction;
  TimeProviderFunction getCurrentTime;
  GetSensorDataFunction getSensorData;
  RegisterSensorFunction registerSensor;
  RejectSensorFunction rejectSensor;
};

}
