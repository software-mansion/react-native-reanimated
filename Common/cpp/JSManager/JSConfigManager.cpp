#include "JSConfigManager.h"

namespace reanimated {

void JSConfigManager::setRuntimeHelper(
    const std::shared_ptr<JSRuntimeHelper> runtimeHelper) {
  runtimeHelper_ = runtimeHelper;
}

void JSConfigManager::setConfigValue(
    const JSConfigType type,
    const jsi::Value &config) {
  auto &runtime = *runtimeHelper_->rnRuntime();
  if (type == JSConfigType::SHARED_TRANSITION_ANIMATION_TYPE) {
    setSharedTransitionConfig(runtime, config);
  }
}

jsi::Value JSConfigManager::getConfigValue(
    const JSConfigType type,
    const int key) {
  if (type == JSConfigType::SHARED_TRANSITION_ANIMATION_TYPE) {
    return jsi::Value(static_cast<int>(getSharedTransitionConfig(key)));
  }
  return jsi::Value::undefined();
}

void JSConfigManager::setSharedTransitionConfig(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  jsi::Object configObject = config.asObject(rt);
  int key = configObject.getProperty(rt, "viewTag").asNumber();
  int animationType = configObject.getProperty(rt, "animationType").asNumber();
  sharedTransitionConfig_[key] =
      static_cast<SharedTransitionType>(animationType);
}

SharedTransitionType JSConfigManager::getSharedTransitionConfig(const int key) {
  return sharedTransitionConfig_[key];
}

} // namespace reanimated
