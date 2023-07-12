#include "AnimatedSensorModule.h"

#include <memory>
#include <utility>

#include "Shareables.h"

namespace reanimated {

AnimatedSensorModule::AnimatedSensorModule(
    const PlatformDepMethodsHolder &platformDepMethodsHolder)
    : platformRegisterSensorFunction_(platformDepMethodsHolder.registerSensor),
      platformUnregisterSensorFunction_(
          platformDepMethodsHolder.unregisterSensor) {}

AnimatedSensorModule::~AnimatedSensorModule() {
  assert(sensorsIds_.empty());
}

jsi::Value AnimatedSensorModule::registerSensor(
    jsi::Runtime &rt,
    const std::shared_ptr<JSRuntimeHelper> &runtimeHelper,
    const std::shared_ptr<RuntimeManager> &runtimeManager,
    const jsi::Value &sensorTypeValue,
    const jsi::Value &interval,
    const jsi::Value &iosReferenceFrame,
    const jsi::Value &sensorDataHandler) {
  SensorType sensorType = static_cast<SensorType>(sensorTypeValue.asNumber());

  auto shareableHandler = extractShareableOrThrow(rt, sensorDataHandler);

  int sensorId = platformRegisterSensorFunction_(
      sensorType,
      interval.asNumber(),
      iosReferenceFrame.asNumber(),
      [sensorType,
       shareableHandler,
       weakRuntimeHelper = std::weak_ptr<JSRuntimeHelper>(runtimeHelper),
       weakRuntimeManager = std::weak_ptr<RuntimeManager>(runtimeManager)](
          double newValues[], int orientationDegrees) {
        auto runtimeHelper = weakRuntimeHelper.lock();
        if (runtimeHelper == nullptr || runtimeHelper->uiRuntimeDestroyed) {
          return;
        }

        auto runtimeManager = weakRuntimeManager.lock();
        if (runtimeManager == nullptr) {
          return;
        }
        auto &uiRuntime = *runtimeManager->runtime;

        jsi::Object value(uiRuntime);
        if (sensorType == SensorType::ROTATION_VECTOR) {
          // TODO: timestamp should be provided by the platform implementation
          // such that the native side has a chance of providing a true event
          // timestamp
          value.setProperty(uiRuntime, "qx", newValues[0]);
          value.setProperty(uiRuntime, "qy", newValues[1]);
          value.setProperty(uiRuntime, "qz", newValues[2]);
          value.setProperty(uiRuntime, "qw", newValues[3]);
          value.setProperty(uiRuntime, "yaw", newValues[4]);
          value.setProperty(uiRuntime, "pitch", newValues[5]);
          value.setProperty(uiRuntime, "roll", newValues[6]);
        } else {
          value.setProperty(uiRuntime, "x", newValues[0]);
          value.setProperty(uiRuntime, "y", newValues[1]);
          value.setProperty(uiRuntime, "z", newValues[2]);
        }
        value.setProperty(
            uiRuntime, "interfaceOrientation", orientationDegrees);

        auto handler = shareableHandler->getJSValue(uiRuntime);
        runOnRuntimeGuarded(uiRuntime, handler, value);
      });
  if (sensorId != -1) {
    sensorsIds_.insert(sensorId);
  }
  return jsi::Value(sensorId);
}

void AnimatedSensorModule::unregisterSensor(const jsi::Value &sensorId) {
  // It is called during sensor hook unmounting
  sensorsIds_.erase(sensorId.getNumber());
  platformUnregisterSensorFunction_(sensorId.asNumber());
}

void AnimatedSensorModule::unregisterAllSensors() {
  for (auto sensorId : sensorsIds_) {
    platformUnregisterSensorFunction_(sensorId);
  }
  sensorsIds_.clear();
}

} // namespace reanimated
