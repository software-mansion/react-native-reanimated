#pragma once

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/uimanager/UIManager.h>
#endif

#include <memory>
#include <string>
#include <unordered_set>
#include <utility>
#include <vector>

#include "AnimatedSensorModule.h"
#include "LayoutAnimationsManager.h"
#include "NativeReanimatedModuleSpec.h"
#include "PlatformDepMethodsHolder.h"
#include "RuntimeDecorator.h"
#include "RuntimeManager.h"
#include "SingleInstanceChecker.h"

#ifdef __APPLE__
#include <RNReanimated/Scheduler.h>
#else
#include "Scheduler.h"
#endif

#ifdef RCT_NEW_ARCH_ENABLED
#include "PropsRegistry.h"
#endif

namespace reanimated {

using FrameCallback = std::function<void(double)>;

class EventHandlerRegistry;

class NativeReanimatedModule : public NativeReanimatedModuleSpec {
 public:
  NativeReanimatedModule(
      const std::shared_ptr<CallInvoker> &jsInvoker,
      const std::shared_ptr<Scheduler> &scheduler,
      const std::shared_ptr<jsi::Runtime> &rt,
#ifdef RCT_NEW_ARCH_ENABLED
  // nothing
#else
      std::function<jsi::Value(jsi::Runtime &, const int, const jsi::String &)>
          propObtainer,
#endif
      PlatformDepMethodsHolder platformDepMethodsHolder);

  ~NativeReanimatedModule();

  std::shared_ptr<RuntimeManager> runtimeManager_;
  std::shared_ptr<JSRuntimeHelper> runtimeHelper;

  void installCoreFunctions(
      jsi::Runtime &rt,
      const jsi::Value &callGuard,
      const jsi::Value &valueUnpacker) override;

  jsi::Value makeShareableClone(
      jsi::Runtime &rt,
      const jsi::Value &value,
      const jsi::Value &shouldRetainRemote) override;

  jsi::Value makeSynchronizedDataHolder(
      jsi::Runtime &rt,
      const jsi::Value &initialShareable) override;
  jsi::Value getDataSynchronously(
      jsi::Runtime &rt,
      const jsi::Value &synchronizedDataHolderRef) override;
  void updateDataSynchronously(
      jsi::Runtime &rt,
      const jsi::Value &synchronizedDataHolderRef,
      const jsi::Value &newData);

  void scheduleOnUI(jsi::Runtime &rt, const jsi::Value &worklet) override;
  void scheduleOnJS(
      jsi::Runtime &rt,
      const jsi::Value &remoteFun,
      const jsi::Value &argsValue);

  jsi::Value registerEventHandler(
      jsi::Runtime &rt,
      const jsi::Value &eventHash,
      const jsi::Value &worklet) override;
  void unregisterEventHandler(
      jsi::Runtime &rt,
      const jsi::Value &registrationId) override;

  jsi::Value getViewProp(
      jsi::Runtime &rt,
      const jsi::Value &viewTag,
      const jsi::Value &propName,
      const jsi::Value &callback) override;

  jsi::Value enableLayoutAnimations(jsi::Runtime &rt, const jsi::Value &config)
      override;
  jsi::Value configureProps(
      jsi::Runtime &rt,
      const jsi::Value &uiProps,
      const jsi::Value &nativeProps) override;
  jsi::Value configureLayoutAnimation(
      jsi::Runtime &rt,
      const jsi::Value &viewTag,
      const jsi::Value &type,
      const jsi::Value &sharedTransitionTag,
      const jsi::Value &config) override;

  void onRender(double timestampMs);

  bool isAnyHandlerWaitingForEvent(std::string eventName);

  void maybeRequestRender();
  UpdatePropsFunction updatePropsFunction;

  bool handleEvent(
      const std::string &eventName,
      const int emitterReactTag,
      const jsi::Value &payload,
      double currentTime);

#ifdef RCT_NEW_ARCH_ENABLED
  bool handleRawEvent(const RawEvent &rawEvent, double currentTime);

  void updateProps(jsi::Runtime &rt, const jsi::Value &operations);

  void removeFromPropsRegistry(jsi::Runtime &rt, const jsi::Value &viewTags);

  void performOperations();

  void dispatchCommand(
      jsi::Runtime &rt,
      const jsi::Value &shadowNodeValue,
      const jsi::Value &commandNameValue,
      const jsi::Value &argsValue);

  jsi::Value measure(jsi::Runtime &rt, const jsi::Value &shadowNodeValue);

  void setUIManager(std::shared_ptr<UIManager> uiManager);

  void setPropsRegistry(std::shared_ptr<PropsRegistry> propsRegistry);
#endif

  jsi::Value registerSensor(
      jsi::Runtime &rt,
      const jsi::Value &sensorType,
      const jsi::Value &interval,
      const jsi::Value &iosReferenceFrame,
      const jsi::Value &sensorDataContainer) override;
  void unregisterSensor(jsi::Runtime &rt, const jsi::Value &sensorId) override;

  void cleanupSensors();

  jsi::Value subscribeForKeyboardEvents(
      jsi::Runtime &rt,
      const jsi::Value &keyboardEventContainer,
      const jsi::Value &isStatusBarTranslucent) override;
  void unsubscribeFromKeyboardEvents(
      jsi::Runtime &rt,
      const jsi::Value &listenerId) override;

  inline LayoutAnimationsManager &layoutAnimationsManager() {
    return layoutAnimationsManager_;
  }

 private:
#ifdef RCT_NEW_ARCH_ENABLED
  bool isThereAnyLayoutProp(jsi::Runtime &rt, const jsi::Object &props);
#endif // RCT_NEW_ARCH_ENABLED

  std::unique_ptr<EventHandlerRegistry> eventHandlerRegistry;
  std::function<void(FrameCallback &, jsi::Runtime &)> requestRender;
  std::vector<FrameCallback> frameCallbacks;
  bool renderRequested = false;
  std::function<jsi::Value(jsi::Runtime &, const int, const jsi::String &)>
      propObtainer;
  std::function<void(double)> onRenderCallback;
  AnimatedSensorModule animatedSensorModule;
  ConfigurePropsFunction configurePropsPlatformFunction;

#ifdef RCT_NEW_ARCH_ENABLED
  SynchronouslyUpdateUIPropsFunction synchronouslyUpdateUIPropsFunction;

  std::shared_ptr<UIManager> uiManager_;

  // After app reload, surfaceId on iOS is still 1 but on Android it's 11.
  // We can store surfaceId of the most recent ShadowNode as a workaround.
  SurfaceId surfaceId_ = -1;

  std::vector<std::pair<ShadowNode::Shared, std::unique_ptr<jsi::Value>>>
      operationsInBatch_; // TODO: refactor std::pair to custom struct

  std::shared_ptr<PropsRegistry> propsRegistry_;

  std::vector<Tag> tagsToRemove_; // from `propsRegistry_`
#endif

  std::unordered_set<std::string> nativePropNames_; // filled by configureProps
  LayoutAnimationsManager layoutAnimationsManager_;

  KeyboardEventSubscribeFunction subscribeForKeyboardEventsFunction;
  KeyboardEventUnsubscribeFunction unsubscribeFromKeyboardEventsFunction;

#ifdef DEBUG
  std::shared_ptr<JSLogger> jsLogger_;
  SingleInstanceChecker<NativeReanimatedModule> singleInstanceChecker_;
#endif
};

} // namespace reanimated
