#pragma once

#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <worklets/SharedItems/Shareables.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <jsi/jsi.h>

#include <memory>
#include <unordered_set>

namespace reanimated {

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

  facebook::jsi::Value registerSensor(
      facebook::jsi::Runtime &rt,
      const std::shared_ptr<worklets::WorkletRuntime> &uiWorkletRuntime,
      const facebook::jsi::Value &sensorType,
      const facebook::jsi::Value &interval,
      const facebook::jsi::Value &iosReferenceFrame,
      const facebook::jsi::Value &sensorDataContainer);
  void unregisterSensor(const facebook::jsi::Value &sensorId);
  void unregisterAllSensors();
};

} // namespace reanimated
