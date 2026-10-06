#pragma once

#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <ReactCommon/CallInvoker.h>
#include <jsi/jsi.h>

#include <memory>
#include <mutex>
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
  HINGE = 6,
};

class AnimatedSensorModule {
  std::unordered_set<int> sensorsIds_;
  IsSensorAvailableFunction platformIsSensorAvailableFunction_;
  RegisterSensorFunction platformRegisterSensorFunction_;
  UnregisterSensorFunction platformUnregisterSensorFunction_;
  const std::shared_ptr<react::CallInvoker> jsInvoker_;
  std::mutex availabilityHandlerMutex_;
  std::shared_ptr<jsi::Function> availabilityHandler_;

 public:
  AnimatedSensorModule(
      const PlatformDepMethodsHolder &platformDepMethodsHolder,
      const std::shared_ptr<react::CallInvoker> &jsInvoker);

  jsi::Value isSensorAvailable(const jsi::Value &sensorType) const;
  jsi::Value registerSensor(
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<WorkletRuntime> &uiRuntime,
      const jsi::Value &sensorType,
      const jsi::Value &interval,
      const jsi::Value &iosReferenceFrame,
      const jsi::Value &sensorDataContainer);
  void unregisterSensor(const jsi::Value &sensorId);
  void unregisterAllSensors();
  void setAvailabilityHandler(jsi::Runtime &rnRuntime, const jsi::Value &handler);
  void notifyAvailabilityChanged(int sensorType, bool isAvailable);
};

} // namespace reanimated
