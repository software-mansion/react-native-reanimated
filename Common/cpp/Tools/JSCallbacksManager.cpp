#include "JSCallbacksManager.h"

namespace reanimated {

JSCallbacksManager::JSCallbacksManager(std::shared_ptr<JSRuntimeHelper> runtimeHelper, PlatformDepMethodsHolder platformDepMethodsHolder) 
  : runtimeHelper_(runtimeHelper),
    registerJSCallbackFunction_(platformDepMethodsHolder.registerJSCallbackFunction),
    unregisterJSCallbackFunction_(platformDepMethodsHolder.unregisterJSCallbackFunction) {}

jsi::Value JSCallbacksManager::registerJSCallback(
    jsi::Runtime &rt,
    const jsi::Value &type,
    const jsi::Value &configuration,
    const jsi::Value &callback) {
  JSCallbackType typeEnum = static_cast<JSCallbackType>(static_cast<int>(type.asNumber()));
  return registerJSCallbackFunction_(rt, typeEnum, configuration, callback);
  return jsi::Value::undefined();
}

void JSCallbacksManager::unregisterJSCallback(
    jsi::Runtime &rt,
    const jsi::Value &type,
    const jsi::Value &callbackId) {
  JSCallbackType typeEnum = static_cast<JSCallbackType>(static_cast<int>(type.asNumber()));
  unregisterJSCallbackFunction_(rt, typeEnum, callbackId);
}

}
