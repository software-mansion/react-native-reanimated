#pragma once

#include <reanimated/AnimatedSensor/AnimatedSensorModule.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/NativeModules/NativeReanimatedModuleSpec.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>
#include <reanimated/Tools/SingleInstanceChecker.h>

#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/Fabric/PropsRegistry.h>
#include <reanimated/Fabric/ReanimatedCommitHook.h>
#include <reanimated/Fabric/ReanimatedMountHook.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>
#endif // RCT_NEW_ARCH_ENABLED

#include <worklets/Registries/EventHandlerRegistry.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/UIScheduler.h>

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/uimanager/UIManager.h>

#include <unordered_set>
#include <utility>
#endif // RCT_NEW_ARCH_ENABLED

#include <memory>
#include <string>
#include <vector>

namespace reanimated {

class NativeReanimatedModule : public NativeReanimatedModuleSpec {
 public:
  NativeReanimatedModule(
      facebook::jsi::Runtime &rnRuntime,
      const std::shared_ptr<worklets::JSScheduler> &jsScheduler,
      const std::shared_ptr<facebook::react::MessageQueueThread> &jsQueue,
      const std::shared_ptr<worklets::UIScheduler> &uiScheduler,
      const PlatformDepMethodsHolder &platformDepMethodsHolder,
      const std::string &valueUnpackerCode,
      const bool isBridgeless,
      const bool isReducedMotion);

  ~NativeReanimatedModule();

  facebook::jsi::Value makeShareableClone(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &value,
      const facebook::jsi::Value &shouldRetainRemote,
      const facebook::jsi::Value &nativeStateSource) override;

  void scheduleOnUI(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &worklet) override;
  facebook::jsi::Value executeOnUIRuntimeSync(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &worklet) override;

  facebook::jsi::Value createWorkletRuntime(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &name,
      const facebook::jsi::Value &initializer) override;
  facebook::jsi::Value scheduleOnRuntime(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &workletRuntimeValue,
      const facebook::jsi::Value &shareableWorkletValue) override;

  facebook::jsi::Value registerEventHandler(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &worklet,
      const facebook::jsi::Value &eventName,
      const facebook::jsi::Value &emitterReactTag) override;
  void unregisterEventHandler(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &registrationId) override;

  facebook::jsi::Value getViewProp(
      facebook::jsi::Runtime &rt,
#ifdef RCT_NEW_ARCH_ENABLED
      const facebook::jsi::Value &shadowNodeWrapper,
#else
      const facebook::jsi::Value &viewTag,
#endif
      const facebook::jsi::Value &propName,
      const facebook::jsi::Value &callback) override;

  facebook::jsi::Value enableLayoutAnimations(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &config) override;
  facebook::jsi::Value configureProps(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &uiProps,
      const facebook::jsi::Value &nativeProps) override;
  facebook::jsi::Value configureLayoutAnimationBatch(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &layoutAnimationsBatch) override;
  void setShouldAnimateExiting(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &viewTag,
      const facebook::jsi::Value &shouldAnimate) override;

  void onRender(double timestampMs);

  bool isAnyHandlerWaitingForEvent(
      const std::string &eventName,
      const int emitterReactTag);

  void maybeRequestRender();

  bool handleEvent(
      const std::string &eventName,
      const int emitterReactTag,
      const facebook::jsi::Value &payload,
      double currentTime);

  inline std::shared_ptr<worklets::JSLogger> getJSLogger() const {
    return jsLogger_;
  }

#ifdef RCT_NEW_ARCH_ENABLED
  bool handleRawEvent(
      const facebook::react::RawEvent &rawEvent,
      double currentTime);

  void updateProps(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &operations);

  void removeFromPropsRegistry(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &viewTags);

  void performOperations();

  void dispatchCommand(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &shadowNodeValue,
      const facebook::jsi::Value &commandNameValue,
      const facebook::jsi::Value &argsValue);

  facebook::jsi::String obtainProp(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &shadowNodeWrapper,
      const facebook::jsi::Value &propName);

  facebook::jsi::Value measure(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &shadowNodeValue);

  void initializeFabric(
      const std::shared_ptr<facebook::react::UIManager> &uiManager);

  void initializeLayoutAnimationsProxy();

  std::string obtainPropFromShadowNode(
      facebook::jsi::Runtime &rt,
      const std::string &propName,
      const facebook::react::ShadowNode::Shared &shadowNode);
#endif

  facebook::jsi::Value registerSensor(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &sensorType,
      const facebook::jsi::Value &interval,
      const facebook::jsi::Value &iosReferenceFrame,
      const facebook::jsi::Value &sensorDataContainer) override;
  void unregisterSensor(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &sensorId) override;

  void cleanupSensors();

  facebook::jsi::Value subscribeForKeyboardEvents(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &keyboardEventContainer,
      const facebook::jsi::Value &isStatusBarTranslucent,
      const facebook::jsi::Value &isNavigationBarTranslucent) override;
  void unsubscribeFromKeyboardEvents(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &listenerId) override;

  inline LayoutAnimationsManager &layoutAnimationsManager() {
    return *layoutAnimationsManager_;
  }

  inline facebook::jsi::Runtime &getUIRuntime() const {
    return uiWorkletRuntime_->getJSIRuntime();
  }

  inline bool isBridgeless() const {
    return isBridgeless_;
  }

  inline bool isReducedMotion() const {
    return isReducedMotion_;
  }

 private:
  void commonInit(const PlatformDepMethodsHolder &platformDepMethodsHolder);

  void requestAnimationFrame(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &callback);

#ifdef RCT_NEW_ARCH_ENABLED
  bool isThereAnyLayoutProp(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Object &props);
  facebook::jsi::Value filterNonAnimatableProps(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &props);
#endif // RCT_NEW_ARCH_ENABLED

  const bool isBridgeless_;
  const bool isReducedMotion_;
  const std::shared_ptr<facebook::react::MessageQueueThread> jsQueue_;
  const std::shared_ptr<worklets::JSScheduler> jsScheduler_;
  const std::shared_ptr<worklets::UIScheduler> uiScheduler_;
  std::shared_ptr<worklets::WorkletRuntime> uiWorkletRuntime_;
  std::string valueUnpackerCode_;

  std::unique_ptr<worklets::EventHandlerRegistry> eventHandlerRegistry_;
  const RequestRenderFunction requestRender_;
  std::vector<std::shared_ptr<facebook::jsi::Value>> frameCallbacks_;
  volatile bool renderRequested_{false};
  const std::function<void(const double)> onRenderCallback_;
  AnimatedSensorModule animatedSensorModule_;
  const std::shared_ptr<worklets::JSLogger> jsLogger_;
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_;

#ifdef RCT_NEW_ARCH_ENABLED
  const SynchronouslyUpdateUIPropsFunction synchronouslyUpdateUIPropsFunction_;

  std::unordered_set<std::string> nativePropNames_; // filled by configureProps
  std::unordered_set<std::string>
      animatablePropNames_; // filled by configureProps
  std::shared_ptr<facebook::react::UIManager> uiManager_;
  std::shared_ptr<LayoutAnimationsProxy> layoutAnimationsProxy_;

  // After app reload, surfaceId on iOS is still 1 but on Android it's 11.
  // We can store surfaceId of the most recent ShadowNode as a workaround.
  facebook::react::SurfaceId surfaceId_ = -1;

  std::vector<std::pair<
      facebook::react::ShadowNode::Shared,
      std::unique_ptr<facebook::jsi::Value>>>
      operationsInBatch_; // TODO: refactor std::pair to custom struct

  std::shared_ptr<PropsRegistry> propsRegistry_;
  std::shared_ptr<ReanimatedCommitHook> commitHook_;
  std::shared_ptr<ReanimatedMountHook> mountHook_;

  std::vector<facebook::react::Tag> tagsToRemove_; // from `propsRegistry_`
#else
  const ObtainPropFunction obtainPropFunction_;
  const ConfigurePropsFunction configurePropsPlatformFunction_;
  const UpdatePropsFunction updatePropsFunction_;
#endif

  const KeyboardEventSubscribeFunction subscribeForKeyboardEventsFunction_;
  const KeyboardEventUnsubscribeFunction unsubscribeFromKeyboardEventsFunction_;

#ifndef NDEBUG
  SingleInstanceChecker<NativeReanimatedModule> singleInstanceChecker_;
#endif
};

} // namespace reanimated
