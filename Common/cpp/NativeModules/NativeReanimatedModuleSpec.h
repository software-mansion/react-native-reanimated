#pragma once

#include <memory>
#include <string>
#include <vector>

#ifdef ANDROID
#include "TurboModule.h"
#else
#include <ReactCommon/TurboModule.h>
#endif

#include <ReactCommon/CallInvoker.h>

using namespace facebook;
using namespace react;

namespace reanimated {

class JSI_EXPORT NativeReanimatedModuleSpec : public TurboModule {
 protected:
  explicit NativeReanimatedModuleSpec(
      const std::shared_ptr<CallInvoker> &jsInvoker);

 public:
  // SharedValue
  virtual jsi::Value makeShareableClone(
      jsi::Runtime &rt,
      const jsi::Value &value,
      const jsi::Value &shouldRetainRemote,
      const jsi::Value &nativeStateSource) = 0;

  // Scheduling
  virtual void scheduleOnUI(jsi::Runtime &rt, const jsi::Value &worklet) = 0;
  virtual jsi::Value executeOnUIRuntimeSync(
      jsi::Runtime &rt,
      const jsi::Value &worklet) = 0;

  // Worklet runtime
  virtual jsi::Value createWorkletRuntime(
      jsi::Runtime &rt,
      const jsi::Value &name,
      const jsi::Value &initializer) = 0;
  virtual jsi::Value scheduleOnRuntime(
      jsi::Runtime &rt,
      const jsi::Value &workletRuntimeValue,
      const jsi::Value &shareableWorkletValue) = 0;

  // events
  virtual jsi::Value registerEventHandler(
      jsi::Runtime &rt,
      const jsi::Value &worklet,
      const jsi::Value &eventName,
      const jsi::Value &emitterReactTag) = 0;
  virtual void unregisterEventHandler(
      jsi::Runtime &rt,
      const jsi::Value &registrationId) = 0;

  // views
  virtual jsi::Value getViewProp(
      jsi::Runtime &rt,
#ifdef RCT_NEW_ARCH_ENABLED
      const jsi::Value &shadowNodeWrapper,
#else
      const jsi::Value &viewTag,
#endif
      const jsi::Value &propName,
      const jsi::Value &callback) = 0;

  // sensors
  virtual jsi::Value registerSensor(
      jsi::Runtime &rt,
      const jsi::Value &sensorType,
      const jsi::Value &interval,
      const jsi::Value &iosReferenceFrame,
      const jsi::Value &sensorDataContainer) = 0;
  virtual void unregisterSensor(
      jsi::Runtime &rt,
      const jsi::Value &sensorId) = 0;

  // keyboard
  virtual jsi::Value subscribeForKeyboardEvents(
      jsi::Runtime &rt,
      const jsi::Value &keyboardEventContainer,
      const jsi::Value &isStatusBarTranslucent) = 0;
  virtual void unsubscribeFromKeyboardEvents(
      jsi::Runtime &rt,
      const jsi::Value &listenerId) = 0;

  // other
  virtual jsi::Value enableLayoutAnimations(
      jsi::Runtime &rt,
      const jsi::Value &config) = 0;
  virtual jsi::Value configureProps(
      jsi::Runtime &rt,
      const jsi::Value &uiProps,
      const jsi::Value &nativeProps) = 0;

  // layout animations
  virtual jsi::Value configureLayoutAnimationBatch(
      jsi::Runtime &rt,
      const jsi::Value &layoutAnimationsBatch) = 0;

  virtual void setShouldAnimateExiting(
      jsi::Runtime &rt,
      const jsi::Value &viewTag,
      const jsi::Value &shouldAnimate) = 0;
};

} // namespace reanimated
