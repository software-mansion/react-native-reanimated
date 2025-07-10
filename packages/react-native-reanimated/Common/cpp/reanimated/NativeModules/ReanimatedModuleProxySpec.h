#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>

#include <memory>
#include <string>
#include <vector>

using namespace facebook;
using namespace react;

namespace reanimated {

class JSI_EXPORT ReanimatedModuleProxySpec : public TurboModule {
 protected:
  explicit ReanimatedModuleProxySpec(
      const std::shared_ptr<CallInvoker> &jsInvoker);

 public:
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
      const jsi::Value &shadowNodeWrapper,
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
      const jsi::Value &isStatusBarTranslucent,
      const jsi::Value &isNavigationBarTranslucent) = 0;
  virtual void unsubscribeFromKeyboardEvents(
      jsi::Runtime &rt,
      const jsi::Value &listenerId) = 0;

  // other
  virtual jsi::Value setDynamicFeatureFlag(
      jsi::Runtime &rt,
      const jsi::Value &name,
      const jsi::Value &value) = 0;

  // layout animations
  virtual jsi::Value configureLayoutAnimationBatch(
      jsi::Runtime &rt,
      const jsi::Value &layoutAnimationsBatch) = 0;

  virtual void setShouldAnimateExiting(
      jsi::Runtime &rt,
      const jsi::Value &viewTag,
      const jsi::Value &shouldAnimate) = 0;

  // JS View style
  virtual void setViewStyle(
      jsi::Runtime &rt,
      const jsi::Value &viewTag,
      const jsi::Value &viewStyle) = 0;

  // Cleanup
  virtual void markNodeAsRemovable(
      jsi::Runtime &rt,
      const jsi::Value &shadowNodeWrapper) = 0;
  virtual void unmarkNodeAsRemovable(
      jsi::Runtime &rt,
      const jsi::Value &viewTag) = 0;

  // CSS animation keyframes
  virtual void registerCSSKeyframes(
      jsi::Runtime &rt,
      const jsi::Value &animationName,
      const jsi::Value &keyframesConfig) = 0;
  virtual void unregisterCSSKeyframes(
      jsi::Runtime &rt,
      const jsi::Value &animationName) = 0;

  // CSS animations
  virtual void applyCSSAnimations(
      jsi::Runtime &rt,
      const jsi::Value &shadowNodeWrapper,
      const jsi::Value &animationUpdates) = 0;
  virtual void unregisterCSSAnimations(const jsi::Value &viewTag) = 0;

  // CSS transitions
  virtual void registerCSSTransition(
      jsi::Runtime &rt,
      const jsi::Value &shadowNodeWrapper,
      const jsi::Value &transitionConfig) = 0;
  virtual void updateCSSTransition(
      jsi::Runtime &rt,
      const jsi::Value &viewTag,
      const jsi::Value &configUpdates) = 0;
  virtual void unregisterCSSTransition(
      jsi::Runtime &rt,
      const jsi::Value &viewTag) = 0;
};

} // namespace reanimated
