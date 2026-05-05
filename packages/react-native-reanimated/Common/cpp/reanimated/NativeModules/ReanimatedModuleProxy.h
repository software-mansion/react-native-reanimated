#pragma once

#include <react/renderer/componentregistry/componentNameByReactViewName.h>
#include <react/renderer/core/ShadowNode.h>
#include <react/renderer/uimanager/UIManager.h>
#include <reanimated/AnimatedSensor/AnimatedSensorModule.h>
#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/CSS/core/CSSTransition.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/CSS/registries/CSSAnimationsRegistry.h>
#include <reanimated/CSS/registries/CSSKeyframesRegistry.h>
#include <reanimated/CSS/registries/CSSTransitionsRegistry.h>
#include <reanimated/CSS/registries/StaticPropsRegistry.h>
#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/Events/UIEventHandlerRegistry.h>
#include <reanimated/Fabric/ReanimatedCommitHook.h>
#include <reanimated/Fabric/ReanimatedCommitShadowNode.h>
#include <reanimated/Fabric/ReanimatedMountHook.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>
#include <reanimated/NativeModules/PropValueProcessor.h>
#include <reanimated/NativeModules/ReanimatedModuleProxySpec.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>
#include <reanimated/Tools/SingleInstanceChecker.h>

#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/UIScheduler.h>

#include <react/renderer/animationbackend/AnimationBackend.h>
#include <react/renderer/uimanager/UIManagerAnimationBackend.h>

#include <cstdint>
#include <memory>
#include <set>
#include <string>
#include <utility>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace css;

enum class GrandCallbackSource : std::uint8_t {
  AnimationLoop,
  Event,
  EventInAndroidDraw,
};

class ReanimatedModuleProxy : public ReanimatedModuleProxySpec,
                              public std::enable_shared_from_this<ReanimatedModuleProxy> {
 public:
  ReanimatedModuleProxy(
      const std::shared_ptr<worklets::WorkletRuntime> &uiRuntime,
      const std::shared_ptr<worklets::UIScheduler> &uiScheduler,
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<CallInvoker> &jsCallInvoker,
      const PlatformDepMethodsHolder &platformDepMethodsHolder,
      const bool isReducedMotion);

  // We need this init method to initialize callbacks with
  // weak_from_this() which is available only after the object
  // is fully constructed.
  void init(const PlatformDepMethodsHolder &platformDepMethodsHolder);

  ~ReanimatedModuleProxy() override;

  jsi::Value registerEventHandler(
      jsi::Runtime &rt,
      const jsi::Value &worklet,
      const jsi::Value &eventName,
      const jsi::Value &emitterReactTag) override;
  void unregisterEventHandler(jsi::Runtime &rt, const jsi::Value &registrationId) override;

  jsi::Value getViewProp(
      jsi::Runtime &rt,
      const jsi::Value &shadowNodeWrapper,
      const jsi::Value &propName,
      const jsi::Value &callback) override;

  jsi::Value getStaticFeatureFlag(jsi::Runtime &rt, const jsi::Value &name) override;
  jsi::Value setDynamicFeatureFlag(jsi::Runtime &rt, const jsi::Value &name, const jsi::Value &value) override;

  jsi::Value configureLayoutAnimationBatch(jsi::Runtime &rt, const jsi::Value &layoutAnimationsBatch) override;
  void setShouldAnimateExiting(jsi::Runtime &rt, const jsi::Value &viewTag, const jsi::Value &shouldAnimate) override;

  void onRender(double timestampMs);

  bool isAnyHandlerWaitingForEvent(const std::string &eventName, const int emitterReactTag);

  void maybeRequestRender();

  bool
  handleEvent(const std::string &eventName, const int emitterReactTag, const jsi::Value &payload, double currentTime);

  bool handleRawEvent(const RawEvent &rawEvent, double currentTime);

  void performOperations();
  void performOperations(const bool isTriggeredByEvent);
  void performNonLayoutOperations();
  void flushLayoutAnimationRequests();

  bool handleEventAndFlush(
      const std::string &eventName,
      int emitterReactTag,
      const jsi::Value &payload,
      GrandCallbackSource state);

  void startBackendIfNeeded();
  void stopBackendIfIdle(const AnimationMutations &mutationsProducedThisTick);

  void setViewStyle(jsi::Runtime &rt, const jsi::Value &viewTag, const jsi::Value &viewStyle) override;

  void markNodeAsRemovable(jsi::Runtime &rt, const jsi::Value &shadowNodeWrapper) override;
  void unmarkNodeAsRemovable(jsi::Runtime &rt, const jsi::Value &viewTag) override;

  void registerCSSKeyframes(
      jsi::Runtime &rt,
      const jsi::Value &animationName,
      const jsi::Value &compoundComponentName,
      const jsi::Value &keyframesConfig) override;
  void unregisterCSSKeyframes(
      jsi::Runtime &rt,
      const jsi::Value &animationName,
      const jsi::Value &compoundComponentName) override;

  void applyCSSAnimations(
      jsi::Runtime &rt,
      const jsi::Value &shadowNodeWrapper,
      const jsi::Value &compoundComponentName,
      const jsi::Value &animationUpdates) override;
  void unregisterCSSAnimations(const jsi::Value &viewTag) override;

  void runCSSTransition(jsi::Runtime &rt, const jsi::Value &shadowNodeWrapper, const jsi::Value &transitionConfig)
      override;
  void unregisterCSSTransition(jsi::Runtime &rt, const jsi::Value &viewTag) override;

  jsi::Value getSettledUpdates(jsi::Runtime &rt) override;

  void dispatchCommand(
      jsi::Runtime &rt,
      const jsi::Value &shadowNodeValue,
      const jsi::Value &commandNameValue,
      const jsi::Value &argsValue);

  jsi::String obtainProp(jsi::Runtime &rt, const jsi::Value &shadowNodeWrapper, const jsi::Value &propName);

  jsi::Value measure(jsi::Runtime &rt, const jsi::Value &shadowNodeValue);

  void initializeFabric(const std::shared_ptr<UIManager> &uiManager);

  void initializeLayoutAnimationsProxy();

  std::string obtainPropFromShadowNode(
      jsi::Runtime &rt,
      const std::string &propName,
      const std::shared_ptr<const ShadowNode> &shadowNode);

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
  void unsubscribeFromKeyboardEvents(jsi::Runtime &rt, const jsi::Value &listenerId) override;

  void toggleSlowAnimationsOnUIRuntime() const;

  inline LayoutAnimationsManager &layoutAnimationsManager() {
    return *layoutAnimationsManager_;
  }

  [[nodiscard]] inline bool isReducedMotion() const {
    return isReducedMotion_;
  }

  void requestFlushRegistry();
  std::function<std::string()> createRegistriesLeakCheck();

 private:
  template <typename Func>
  void withAnimationBackend(Func &&fn) {
    auto weak = uiManager_->unstable_getAnimationBackend();
    if (auto locked = weak.lock()) {
      fn(std::static_pointer_cast<AnimationBackend>(locked));
    }
  }

  void commitUpdates(jsi::Runtime &rt, const UpdatesBatch &updatesBatch);
  void applySynchronousUpdates(UpdatesBatch &updatesBatch, bool allowPartialUpdates = false);

  AnimationMutations grandCallback(AnimationTimestamp timestamp, GrandCallbackSource state);
  void executeWorkletsForFrame(AnimationTimestamp timestamp);
  AnimationMutations collectAnimationUpdates(AnimationTimestamp timestamp);
  AnimationMutations collectEventUpdates();
  AnimationMutations collectNonLayoutAnimationUpdates();
  AnimationMutations mutationsFromAnimatedPropsBatch(UpdatesBatchAnimatedProps &&animatedPropsBatch);

  const bool isReducedMotion_;
  bool shouldFlushRegistry_ = false;
  std::shared_ptr<worklets::WorkletRuntime> uiRuntime_;
  std::shared_ptr<worklets::UIScheduler> uiScheduler_;

  std::unique_ptr<UIEventHandlerRegistry> eventHandlerRegistry_;
  RequestRenderFunction requestRender_;
  volatile bool renderRequested_{false};
  bool isAnimationRunning_{false};
  CallbackId callbackId_{0};
  std::function<void(const double)> onRenderCallback_;
  AnimatedSensorModule animatedSensorModule_;
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_;
  GetAnimationTimestampFunction getAnimationTimestamp_;
  std::function<void(double)> pendingAnimationFrameCallback_;

#ifdef __APPLE__
  ForceScreenSnapshotFunction forceScreenSnapshot_;
#endif
  std::shared_ptr<OperationsLoop> operationsLoop_;

  const std::shared_ptr<AnimatedPropsRegistry> animatedPropsRegistry_;
  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;
  const std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  const std::shared_ptr<CSSKeyframesRegistry> cssAnimationKeyframesRegistry_;
  const std::shared_ptr<CSSAnimationsRegistry> cssAnimationsRegistry_;
  const std::shared_ptr<CSSTransitionsRegistry> cssTransitionsRegistry_;

  const SynchronouslyUpdateUIPropsFunction synchronouslyUpdateUIPropsFunction_;
  const PreserveMountedTagsFunction filterUnmountedTagsFunction_;

  std::shared_ptr<UIManager> uiManager_;
  std::shared_ptr<LayoutAnimationsProxyCommon> layoutAnimationsProxy_;
  std::shared_ptr<ReanimatedCommitHook> commitHook_;
  std::shared_ptr<ReanimatedMountHook> mountHook_;
  std::set<SurfaceId> layoutAnimationFlushRequests_;
  bool layoutAnimationRenderRequested_;

  const KeyboardEventSubscribeFunction subscribeForKeyboardEventsFunction_;
  const KeyboardEventUnsubscribeFunction unsubscribeFromKeyboardEventsFunction_;

#ifndef NDEBUG
  SingleInstanceChecker<ReanimatedModuleProxy> singleInstanceChecker_;
#endif // NDEBUG
};

} // namespace reanimated
