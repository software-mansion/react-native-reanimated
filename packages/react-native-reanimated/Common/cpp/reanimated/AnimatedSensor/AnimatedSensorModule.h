#pragma once

#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <jsi/jsi.h>

#include <memory>
#include <unordered_set>

namespace reanimated {

using namespace facebook;
using namespace worklets;

enum class SensorType : std::uint8_t {
  ACCELEROMETER = 1,
  GYROSCOPE = 2,
  GRAVITY = 3,
  MAGNETIC_FIELD = 4,
  ROTATION_VECTOR = 5,
};

class AnimatedSensorModule {
  std::unordered_set<int> sensorsIds_;
  IsSensorAvailableFunction platformIsSensorAvailableFunction_;
  RegisterSensorFunction platformRegisterSensorFunction_;
  UnregisterSensorFunction platformUnregisterSensorFunction_;

 public:
  explicit AnimatedSensorModule(const PlatformDepMethodsHolder &platformDepMethodsHolder);

  bool isSensorAvailable(double sensorType) const;
  jsi::Value registerSensor(
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<WorkletRuntime> &uiRuntime,
      double sensorType,
      double interval,
      double iosReferenceFrame,
      const jsi::Value &sensorDataContainer);
  void unregisterSensor(double sensorId);
  void unregisterAllSensors();
};

} // namespace reanimated
