#include "JSCallbacksManager.h"

namespace reanimated {

JSCallbacksManager::JSCallbacksManager(std::shared_ptr<JSRuntimeHelper> runtimeHelper, PlatformDepMethodsHolder platformDepMethodsHolder) 
  : runtimeHelper_(runtimeHelper) {}

jsi::Value JSCallbacksManager::registerJSCallback(
    jsi::Runtime &rt,
    const jsi::Value &type,
    const jsi::Value &configuration,
    const jsi::Value &callback) {
  JSCallbackType typeEnum = static_cast<JSCallbackType>(static_cast<int>(type.asNumber()));
//  return registerJSCallbackFunction_(rt, typeEnum, configuration, callback);
//  callbacks_.emplace_back(callback.asObject(rt).asFunction(rt));
  auto shareableHandler = extractShareableOrThrow(rt, callback);
  callbacks_.emplace_back([shareableHandler, weakRuntimeHelper = std::weak_ptr<JSRuntimeHelper>(runtimeHelper_)](double progress){
    auto runtimeHelper = weakRuntimeHelper.lock();
    if (runtimeHelper == nullptr || runtimeHelper->uiRuntimeDestroyed) {
      return jsi::Value::null();
    }
    auto uiRuntime = runtimeHelper->uiRuntime();
    auto handler = shareableHandler->getJSValue(*uiRuntime);
    return runtimeHelper->runOnUIGuardedWithResult(handler, progress);
//    return jsi::Value::null();
  });
  return jsi::Value::undefined();
}

void JSCallbacksManager::unregisterJSCallback(
    jsi::Runtime &rt,
    const jsi::Value &type,
    const jsi::Value &callbackId) {
  JSCallbackType typeEnum = static_cast<JSCallbackType>(static_cast<int>(type.asNumber()));
  // to do
}

jsi::Value JSCallbacksManager::tmp(double progress) {
  int a = 0;
  jsi::Value value = jsi::Value::undefined();
  for (const auto &callback : callbacks_) {
    value = callback(progress);
  }
  return value;
}

}
