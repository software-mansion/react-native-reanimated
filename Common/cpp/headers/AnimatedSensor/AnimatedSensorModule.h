#pragma once

#include <jsi/jsi.h>
#include <set>

#include "PlatformDepMethodsHolder.h"
#include "RuntimeManager.h"

namespace reanimated {

using namespace facebook;

enum SensorType {
  ACCELEROMETER = 1,
  GYROSCOPE = 2,
  GRAVITY = 3,
  MAGNETIC_FIELD = 4,
  ROTATION_VECTOR = 5,
};

class AnimatedSensorModule {
  std::set<int> sensorsIds;
  RegisterSensorFunction platformRegisterSensorFunction;
  UnregisterSensorFunction platformUnregisterSensorFunction;
  RuntimeManager *runtimeManager;

 public:
  AnimatedSensorModule(
      const PlatformDepMethodsHolder &platformDepMethodsHolder,
      RuntimeManager *runtimeManager);
  ~AnimatedSensorModule();

  jsi::Value registerSensor(
      jsi::Runtime &rt,
      const jsi::Value &sensorType,
      const jsi::Value &interval,
      const jsi::Value &sensorDataContainer);
  void unregisterSensor(const jsi::Value &sensorId);
};

} // namespace reanimated
