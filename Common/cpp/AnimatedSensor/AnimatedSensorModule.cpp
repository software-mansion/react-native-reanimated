#include "AnimatedSensorModule.h"
#include "MutableValue.h"
#include "ValueWrapper.h"

namespace reanimated {

AnimatedSensorModule::AnimatedSensorModule(
    const PlatformDepMethodsHolder &platformDepMethodsHolder,
    RuntimeManager *runtimeManager) {
  platformRegisterSensorFunction = platformDepMethodsHolder.registerSensor;
  platformUnregisterSensorFunction = platformDepMethodsHolder.unregisterSensor;
  this->runtimeManager = runtimeManager;
}

AnimatedSensorModule::~AnimatedSensorModule() {
  for (auto sensorId : sensorsIds) {
    platformUnregisterSensorFunction(sensorId);
  }
  sensorsIds.clear();
}

jsi::Value AnimatedSensorModule::registerSensor(
    jsi::Runtime &rt,
    const jsi::Value &sensorType,
    const jsi::Value &interval,
    const jsi::Value &sensorDataContainer) {
  std::vector<const char *> propertiesName;
  if (sensorType.asNumber() == SensorType::ROTATION_VECTOR) {
    propertiesName = {"qw", "qx", "qy", "qz", "yaw", "pitch", "roll"};
  } else {
    propertiesName = {"x", "y", "z"};
  }
  std::shared_ptr<ShareableValue> sensorsData = ShareableValue::adapt(
      rt, sensorDataContainer.getObject(rt), runtimeManager);
  auto &mutableObject =
      ValueWrapper::asMutableValue(sensorsData->valueContainer);
  auto setter = [&, mutableObject, propertiesName](double newValues[]) {
    jsi::Runtime &rt = *runtimeManager->runtime.get();
    jsi::Object value(rt);
    int index = 0;
    for (const auto &name : propertiesName) {
      value.setProperty(rt, name, newValues[index]);
      index++;
    }
    mutableObject->setValue(rt, std::move(value));
  };
  int sensorId = platformRegisterSensorFunction(
      sensorType.asNumber(), interval.asNumber(), setter);
  if (sensorId != -1) {
    sensorsIds.insert(sensorId);
  }
  return jsi::Value(sensorId);
}

void AnimatedSensorModule::unregisterSensor(const jsi::Value &sensorId) {
  sensorsIds.erase(sensorId.getNumber());
  platformUnregisterSensorFunction(sensorId.asNumber());
}

} // namespace reanimated
