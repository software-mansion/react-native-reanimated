#include <reanimated/NativeModules/DummyReanimatedModuleProxy.h>
#include <reanimated/RuntimeDecorators/UIRuntimeDecorator.h>
#include <reanimated/Tools/CollectionUtils.h>
#include <reanimated/Tools/FeaturesConfig.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>
#include <unordered_map>

#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/Fabric/ReanimatedCommitShadowNode.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#endif // RCT_NEW_ARCH_ENABLED

#include <worklets/Registries/EventHandlerRegistry.h>
#include <worklets/SharedItems/Shareables.h>
#include <worklets/Tools/AsyncQueue.h>
#include <worklets/Tools/WorkletEventHandler.h>

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif // __ANDROID__

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/scheduler/Scheduler.h>
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>
#endif // RCT_NEW_ARCH_ENABLED

using namespace facebook;

namespace reanimated {

DummyReanimatedModuleProxy::DummyReanimatedModuleProxy(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<CallInvoker> &jsCallInvoker,
    const bool isBridgeless,
    const bool isReducedMotion)
    : ReanimatedModuleProxySpec(jsCallInvoker),
      isBridgeless_(isBridgeless),
      isReducedMotion_(isReducedMotion) {}

jsi::Value DummyReanimatedModuleProxy::registerEventHandler(
    jsi::Runtime &rt,
    const jsi::Value &worklet,
    const jsi::Value &eventName,
    const jsi::Value &emitterReactTag) {
  return jsi::Value(static_cast<double>(0));
}

void DummyReanimatedModuleProxy::unregisterEventHandler(
    jsi::Runtime &rt,
    const jsi::Value &registrationId) {}

jsi::Value DummyReanimatedModuleProxy::getViewProp(
    jsi::Runtime &rnRuntime,
    const jsi::Value &viewTag,
    const jsi::Value &propName,
    const jsi::Value &callback) {
  return jsi::Value::undefined();
}

jsi::Value DummyReanimatedModuleProxy::enableLayoutAnimations(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  return jsi::Value::undefined();
}

jsi::Value DummyReanimatedModuleProxy::configureProps(
    jsi::Runtime &rt,
    const jsi::Value &uiProps,
    const jsi::Value &nativeProps) {
  return jsi::Value::undefined();
}

jsi::Value DummyReanimatedModuleProxy::configureLayoutAnimationBatch(
    jsi::Runtime &rt,
    const jsi::Value &layoutAnimationsBatch) {
  return jsi::Value::undefined();
}

void DummyReanimatedModuleProxy::setShouldAnimateExiting(
    jsi::Runtime &rt,
    const jsi::Value &viewTag,
    const jsi::Value &shouldAnimate) {}

jsi::Value DummyReanimatedModuleProxy::registerSensor(
    jsi::Runtime &rt,
    const jsi::Value &sensorType,
    const jsi::Value &interval,
    const jsi::Value &iosReferenceFrame,
    const jsi::Value &sensorDataContainer) {
  return jsi::Value(static_cast<double>(0));
}

void DummyReanimatedModuleProxy::unregisterSensor(
    jsi::Runtime &rt,
    const jsi::Value &sensorId) {}

jsi::Value DummyReanimatedModuleProxy::subscribeForKeyboardEvents(
    jsi::Runtime &rt,
    const jsi::Value &handlerWorklet,
    const jsi::Value &isStatusBarTranslucent,
    const jsi::Value &isNavigationBarTranslucent) {
  return jsi::Value(static_cast<double>(0));
}

void DummyReanimatedModuleProxy::unsubscribeFromKeyboardEvents(
    jsi::Runtime &rt,
    const jsi::Value &listenerId) {}

} // namespace reanimated
