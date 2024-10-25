#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>

#include <memory>

namespace reanimated {

class JSI_EXPORT NativeReanimatedModuleSpec
    : public facebook::react::TurboModule {
 protected:
  explicit NativeReanimatedModuleSpec(
      const std::shared_ptr<facebook::react::CallInvoker> &jsInvoker);

 public:
  // SharedValue
  virtual facebook::jsi::Value makeShareableClone(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &value,
      const facebook::jsi::Value &shouldRetainRemote,
      const facebook::jsi::Value &nativeStateSource) = 0;

  // Scheduling
  virtual void scheduleOnUI(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &worklet) = 0;
  virtual facebook::jsi::Value executeOnUIRuntimeSync(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &worklet) = 0;

  // Worklet runtime
  virtual facebook::jsi::Value createWorkletRuntime(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &name,
      const facebook::jsi::Value &initializer) = 0;
  virtual facebook::jsi::Value scheduleOnRuntime(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &workletRuntimeValue,
      const facebook::jsi::Value &shareableWorkletValue) = 0;

  // events
  virtual facebook::jsi::Value registerEventHandler(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &worklet,
      const facebook::jsi::Value &eventName,
      const facebook::jsi::Value &emitterReactTag) = 0;
  virtual void unregisterEventHandler(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &registrationId) = 0;

  // views
  virtual facebook::jsi::Value getViewProp(
      facebook::jsi::Runtime &rt,
#ifdef RCT_NEW_ARCH_ENABLED
      const facebook::jsi::Value &shadowNodeWrapper,
#else
      const facebook::jsi::Value &viewTag,
#endif
      const facebook::jsi::Value &propName,
      const facebook::jsi::Value &callback) = 0;

  // sensors
  virtual facebook::jsi::Value registerSensor(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &sensorType,
      const facebook::jsi::Value &interval,
      const facebook::jsi::Value &iosReferenceFrame,
      const facebook::jsi::Value &sensorDataContainer) = 0;
  virtual void unregisterSensor(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &sensorId) = 0;

  // keyboard
  virtual facebook::jsi::Value subscribeForKeyboardEvents(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &keyboardEventContainer,
      const facebook::jsi::Value &isStatusBarTranslucent,
      const facebook::jsi::Value &isNavigationBarTranslucent) = 0;
  virtual void unsubscribeFromKeyboardEvents(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &listenerId) = 0;

  // other
  virtual facebook::jsi::Value enableLayoutAnimations(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &config) = 0;
  virtual facebook::jsi::Value configureProps(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &uiProps,
      const facebook::jsi::Value &nativeProps) = 0;

  // layout animations
  virtual facebook::jsi::Value configureLayoutAnimationBatch(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &layoutAnimationsBatch) = 0;

  virtual void setShouldAnimateExiting(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &viewTag,
      const facebook::jsi::Value &shouldAnimate) = 0;
};

} // namespace reanimated
