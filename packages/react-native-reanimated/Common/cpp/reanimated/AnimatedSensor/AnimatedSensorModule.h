#pragma once

#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <worklets/SharedItems/Shareables.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <jsi/jsi.h>

#include <memory>
#include <unordered_set>

namespace reanimated {

using namespace facebook;
using namespace worklets;

enum SensorType {
  ACCELEROMETER = 1,
  GYROSCOPE = 2,
  GRAVITY = 3,
  MAGNETIC_FIELD = 4,
  ROTATION_VECTOR = 5,
};

class AnimatedSensorModule {
  std::unordered_set<int> sensorsIds_;
  RegisterSensorFunction platformRegisterSensorFunction_;
  UnregisterSensorFunction platformUnregisterSensorFunction_;

 public:
  AnimatedSensorModule(
      const PlatformDepMethodsHolder &platformDepMethodsHolder);
  ~AnimatedSensorModule();

  jsi::Value registerSensor(
      jsi::Runtime &rt,
      const std::shared_ptr<WorkletRuntime> &uiWorkletRuntime,
      const jsi::Value &sensorType,
      const jsi::Value &interval,
      const jsi::Value &iosReferenceFrame,
      const jsi::Value &sensorDataContainer);
  void unregisterSensor(const jsi::Value &sensorId);
  void unregisterAllSensors();
};

} // namespace reanimated
