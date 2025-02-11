#pragma once

#include <reanimated/AnimatedSensor/AnimatedSensorModule.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/NativeModules/ReanimatedModuleProxySpec.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/Fabric/ReanimatedCommitShadowNode.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>

#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/CSS/core/CSSTransition.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/CSS/registry/CSSAnimationsRegistry.h>
#include <reanimated/CSS/registry/CSSTransitionsRegistry.h>
#include <reanimated/CSS/registry/StaticPropsRegistry.h>
#include <reanimated/Fabric/ReanimatedCommitHook.h>
#include <reanimated/Fabric/ReanimatedMountHook.h>
#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>
#endif // RCT_NEW_ARCH_ENABLED

#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/Registries/EventHandlerRegistry.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/SingleInstanceChecker.h>
#include <worklets/Tools/UIScheduler.h>

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/uimanager/UIManager.h>
#endif // RCT_NEW_ARCH_ENABLED

#include <react/renderer/core/ShadowNode.h>

#include <memory>
#include <string>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

using namespace facebook;

using UpdatesBatch =
    std::vector<std::pair<ShadowNode::Shared, std::unique_ptr<jsi::Value>>>;

class ReanimatedModuleProxy
    : public ReanimatedModuleProxySpec,
      public std::enable_shared_from_this<ReanimatedModuleProxy> {
 public:
  ReanimatedModuleProxy(
      const std::shared_ptr<WorkletsModuleProxy> &workletsModuleProxy,
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<CallInvoker> &jsCallInvoker,
      const PlatformDepMethodsHolder &platformDepMethodsHolder,
      const bool isBridgeless,
      const bool isReducedMotion);

  // We need this init method to initialize callbacks with
  // weak_from_this() which is available only after the object
  // is fully constructed.
  void init(const PlatformDepMethodsHolder &platformDepMethodsHolder);

  ~ReanimatedModuleProxy();

  jsi::Value registerEventHandler(
      jsi::Runtime &rt,
      const jsi::Value &worklet,
      const jsi::Value &eventName,
      const jsi::Value &emitterReactTag) override;
  void unregisterEventHandler(
      jsi::Runtime &rt,
      const jsi::Value &registrationId) override;

  jsi::Value getViewProp(
      jsi::Runtime &rt,
#ifdef RCT_NEW_ARCH_ENABLED
      const jsi::Value &shadowNodeWrapper,
#else
      const jsi::Value &viewTag,
#endif
      const jsi::Value &propName,
      const jsi::Value &callback) override;

  jsi::Value enableLayoutAnimations(jsi::Runtime &rt, const jsi::Value &config)
      override;
  jsi::Value configureProps(
      jsi::Runtime &rt,
      const jsi::Value &uiProps,
      const jsi::Value &nativeProps) override;
  jsi::Value configureLayoutAnimationBatch(
      jsi::Runtime &rt,
      const jsi::Value &layoutAnimationsBatch) override;
  void setShouldAnimateExiting(
      jsi::Runtime &rt,
      const jsi::Value &viewTag,
      const jsi::Value &shouldAnimate) override;

  void onRender(double timestampMs);

  bool isAnyHandlerWaitingForEvent(
      const std::string &eventName,
      const int emitterReactTag);

  void maybeRequestRender();

  bool handleEvent(
      const std::string &eventName,
      const int emitterReactTag,
      const jsi::Value &payload,
      double currentTime);

  inline std::shared_ptr<JSLogger> getJSLogger() const {
    return jsLogger_;
  }

#ifdef RCT_NEW_ARCH_ENABLED
  bool handleRawEvent(const RawEvent &rawEvent, double currentTime);

  void maybeRunCSSLoop();
  double getCssTimestamp();

  void performOperations();

  void setViewStyle(
      jsi::Runtime &rt,
      const jsi::Value &viewTag,
      const jsi::Value &viewStyle) override;
  void removeViewStyle(jsi::Runtime &rt, const jsi::Value &viewTag) override;

  void registerCSSAnimations(
      jsi::Runtime &rt,
      const jsi::Value &shadowNodeWrapper,
      const jsi::Value &animationConfigs) override;
  void updateCSSAnimations(
      jsi::Runtime &rt,
      const jsi::Value &viewTag,
      const jsi::Value &settingsUpdates) override;
  void unregisterCSSAnimations(const jsi::Value &viewTag) override;

  void registerCSSTransition(
      jsi::Runtime &rt,
      const jsi::Value &shadowNodeWrapper,
      const jsi::Value &transitionConfig) override;
  void updateCSSTransition(
      jsi::Runtime &rt,
      const jsi::Value &viewTag,
      const jsi::Value &configUpdates) override;
  void unregisterCSSTransition(jsi::Runtime &rt, const jsi::Value &viewTag)
      override;

  void cssLoopCallback(const double /*timestampMs*/);

  void dispatchCommand(
      jsi::Runtime &rt,
      const jsi::Value &shadowNodeValue,
      const jsi::Value &commandNameValue,
      const jsi::Value &argsValue);

  jsi::String obtainProp(
      jsi::Runtime &rt,
      const jsi::Value &shadowNodeWrapper,
      const jsi::Value &propName);

  jsi::Value measure(jsi::Runtime &rt, const jsi::Value &shadowNodeValue);

  void initializeFabric(const std::shared_ptr<UIManager> &uiManager);

  void initializeLayoutAnimationsProxy();

  std::string obtainPropFromShadowNode(
      jsi::Runtime &rt,
      const std::string &propName,
      const ShadowNode::Shared &shadowNode);
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
      const jsi::Value &isStatusBarTranslucent,
      const jsi::Value &isNavigationBarTranslucent) override;
  void unsubscribeFromKeyboardEvents(
      jsi::Runtime &rt,
      const jsi::Value &listenerId) override;

  inline LayoutAnimationsManager &layoutAnimationsManager() {
    return *layoutAnimationsManager_;
  }

  [[nodiscard]] inline bool isBridgeless() const {
    return isBridgeless_;
  }

  [[nodiscard]] inline bool isReducedMotion() const {
    return isReducedMotion_;
  }

  [[nodiscard]] inline std::shared_ptr<WorkletsModuleProxy>
  getWorkletsModuleProxy() const {
    return workletsModuleProxy_;
  }

  void requestFlushRegistry();

 private:
  void requestAnimationFrame(jsi::Runtime &rt, const jsi::Value &callback);
  void commitUpdates(jsi::Runtime &rt, const UpdatesBatch &updatesBatch);

#ifdef RCT_NEW_ARCH_ENABLED
  jsi::Value filterNonAnimatableProps(
      jsi::Runtime &rt,
      const jsi::Value &props);
#endif // RCT_NEW_ARCH_ENABLED

  const bool isBridgeless_;
  const bool isReducedMotion_;
  bool shouldFlushRegistry_ = false;
  std::shared_ptr<WorkletsModuleProxy> workletsModuleProxy_;
  const std::string valueUnpackerCode_;

  std::unique_ptr<EventHandlerRegistry> eventHandlerRegistry_;
  const RequestRenderFunction requestRender_;
  std::vector<std::shared_ptr<jsi::Value>> frameCallbacks_;
  volatile bool renderRequested_{false};
  std::function<void(const double)> onRenderCallback_;
  AnimatedSensorModule animatedSensorModule_;
  const std::shared_ptr<JSLogger> jsLogger_;
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_;
  GetAnimationTimestampFunction getAnimationTimestamp_;

#ifdef RCT_NEW_ARCH_ENABLED
  bool cssLoopRunning_{false};
  bool shouldUpdateCssAnimations_{true};
  double currentCssTimestamp_{0};

  const std::shared_ptr<AnimatedPropsRegistry> animatedPropsRegistry_;
  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;
  const std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;
  const std::shared_ptr<CSSAnimationsRegistry> cssAnimationsRegistry_;
  const std::shared_ptr<CSSTransitionsRegistry> cssTransitionsRegistry_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  const SynchronouslyUpdateUIPropsFunction synchronouslyUpdateUIPropsFunction_;

  std::unordered_set<std::string> nativePropNames_; // filled by configureProps
  std::unordered_set<std::string>
      animatablePropNames_; // filled by configureProps
  std::shared_ptr<UIManager> uiManager_;
  std::shared_ptr<LayoutAnimationsProxy> layoutAnimationsProxy_;
  std::shared_ptr<ReanimatedCommitHook> commitHook_;
  std::shared_ptr<ReanimatedMountHook> mountHook_;
#else
  const ObtainPropFunction obtainPropFunction_;
  const ConfigurePropsFunction configurePropsPlatformFunction_;
  const UpdatePropsFunction updatePropsFunction_;
#endif

  const KeyboardEventSubscribeFunction subscribeForKeyboardEventsFunction_;
  const KeyboardEventUnsubscribeFunction unsubscribeFromKeyboardEventsFunction_;

#ifndef NDEBUG
  worklets::SingleInstanceChecker<ReanimatedModuleProxy> singleInstanceChecker_;
#endif // NDEBUG
};

} // namespace reanimated
