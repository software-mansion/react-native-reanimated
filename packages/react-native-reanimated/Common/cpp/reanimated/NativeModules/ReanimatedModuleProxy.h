#pragma once

#include <ReactCommon/CallInvoker.h>
#include <cxxreact/ReactNativeVersion.h>
#include <react/renderer/componentregistry/componentNameByReactViewName.h>
#include <react/renderer/core/ShadowNode.h>
#include <react/renderer/uimanager/UIManager.h>
#include <reanimated/AnimatedSensor/AnimatedSensorModule.h>
#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/CSS/core/transition/CSSTransition.h>
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
#include <reanimated/PseudoStyles/PseudoStylesRegistry.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>
#include <reanimated/Tools/SingleInstanceChecker.h>

#if REACT_NATIVE_VERSION_MINOR >= 85
#include <react/renderer/animationbackend/AnimationBackend.h>
#include <react/renderer/uimanager/UIManagerAnimationBackend.h>
#endif

#include <atomic>
#include <cstdint>
#include <functional>
#include <memory>
#include <mutex>
#include <set>
#include <string>
#include <utility>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace facebook::react;
using namespace css;

enum class GrandCallbackSource : std::uint8_t {
  // Used when a new vsync signal is triggered
  AnimationLoop,

  // Used when handling an event (excluding the draw pass)
  Event,

  // Used when handling an event originating from the Android draw pass,
  // the info is used to avoid performing Tree Hierarchy updates when this could break the app
  EventInAndroidDraw,
};

class ReanimatedModuleProxy : public std::enable_shared_from_this<ReanimatedModuleProxy> {
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

  ~ReanimatedModuleProxy();

  [[nodiscard]]
  jsi::Object toOptimizedObject(jsi::Runtime &rt);

  jsi::Value registerEventHandler(
      jsi::Runtime &rt,
      const jsi::Value &worklet,
      const jsi::Value &eventName,
      const jsi::Value &emitterReactTag);
  void unregisterEventHandler(jsi::Runtime &rt, const jsi::Value &registrationId);

  jsi::Value getViewProp(
      jsi::Runtime &rt,
      const jsi::Value &shadowNodeWrapper,
      const jsi::Value &propName,
      const jsi::Value &callback);

  jsi::Value getStaticFeatureFlag(jsi::Runtime &rt, const jsi::Value &name);
  jsi::Value setDynamicFeatureFlag(jsi::Runtime &rt, const jsi::Value &name, const jsi::Value &value);

  jsi::Value configureLayoutAnimationBatch(jsi::Runtime &rt, const jsi::Value &layoutAnimationsBatch);
  void setShouldAnimateExiting(jsi::Runtime &rt, const jsi::Value &viewTag, const jsi::Value &shouldAnimate);

  bool isAnyHandlerWaitingForEvent(const std::string &eventName, const int emitterReactTag);

  bool
  handleEvent(const std::string &eventName, const int emitterReactTag, const jsi::Value &payload, double currentTime);

  bool handleRawEvent(const RawEvent &rawEvent, double currentTime);

  void performOperations();
  void performNonLayoutOperations();
  void executeLayoutAnimationsRequests();

  bool handleEventAndFlush(
      const std::string &eventName,
      int emitterReactTag,
      const jsi::Value &payload,
      GrandCallbackSource source);

  void startBackendIfNeeded();
  void stopBackendIfIdle(bool producedMutations);

  void setViewStyle(jsi::Runtime &rt, const jsi::Value &viewTag, const jsi::Value &viewStyle);

  void markNodeAsRemovable(jsi::Runtime &rt, const jsi::Value &shadowNodeWrapper);
  void unmarkNodeAsRemovable(jsi::Runtime &rt, const jsi::Value &viewTag);

  void registerCSSKeyframes(
      jsi::Runtime &rt,
      const jsi::Value &animationName,
      const jsi::Value &compoundComponentName,
      const jsi::Value &keyframesConfig);
  void
  unregisterCSSKeyframes(jsi::Runtime &rt, const jsi::Value &animationName, const jsi::Value &compoundComponentName);

  void applyCSSAnimations(
      jsi::Runtime &rt,
      const jsi::Value &shadowNodeWrapper,
      const jsi::Value &compoundComponentName,
      const jsi::Value &animationUpdates);
  void unregisterCSSAnimations(const jsi::Value &viewTag);

  void runCSSTransition(jsi::Runtime &rt, const jsi::Value &shadowNodeWrapper, const jsi::Value &transitionConfig);
  void unregisterCSSTransition(jsi::Runtime &rt, const jsi::Value &viewTag);

  void registerPseudoStyle(jsi::Runtime &rt, const jsi::Value &shadowNodeWrapper, const jsi::Value &config);
  void unregisterPseudoStyle(jsi::Runtime &rt, const jsi::Value &viewTag);

  jsi::Value getSettledUpdates(jsi::Runtime &rt);

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
      const jsi::Value &sensorDataContainer);
  void unregisterSensor(jsi::Runtime &rt, const jsi::Value &sensorId);

  void cleanupSensors();

  jsi::Value subscribeForKeyboardEvents(
      jsi::Runtime &rt,
      const jsi::Value &keyboardEventContainer,
      const jsi::Value &isStatusBarTranslucent,
      const jsi::Value &isNavigationBarTranslucent);
  void unsubscribeFromKeyboardEvents(jsi::Runtime &rt, const jsi::Value &listenerId);

  void toggleSlowAnimationsOnUIRuntime() const;

  inline LayoutAnimationsManager &layoutAnimationsManager() {
    return *layoutAnimationsManager_;
  }

  [[nodiscard]] inline bool isReducedMotion() const {
    return isReducedMotion_;
  }

  void requestFlushRegistry();
  std::function<std::string()> createRegistriesLeakCheck();

  void commitUpdates(jsi::Runtime &rt, const UpdatesBatch &updatesBatch);
  void applySynchronousUpdates(UpdatesBatch &updatesBatch, bool allowPartialUpdates);

#if REACT_NATIVE_VERSION_MINOR >= 85
  std::shared_ptr<UIManagerAnimationBackend> getAnimationBackend();
  AnimationMutations runGrandCallback(AnimationTimestamp timestamp, GrandCallbackSource source);
  void executeOperationsLoop(AnimationTimestamp timestamp);
  void executeWorkletsForFrame(AnimationTimestamp timestamp);
  AnimationMutations executeOperationsAndCollectUpdates(AnimationTimestamp timestamp);
  AnimationMutations collectEventUpdates();
  AnimationMutations collectNonLayoutAnimationUpdates();
  AnimationMutations mutationsFromAnimatedPropsBatch(UpdatesBatchAnimatedProps &&animatedPropsBatch);
#endif

  const bool isReducedMotion_;
  std::atomic<bool> shouldFlushRegistry_{false};
  std::shared_ptr<worklets::WorkletRuntime> uiRuntime_;
  std::shared_ptr<worklets::UIScheduler> uiScheduler_;
  std::shared_ptr<CallInvoker> jsInvoker_;

  std::unique_ptr<UIEventHandlerRegistry> eventHandlerRegistry_;
  RequestRenderFunction requestRender_;
  bool isAnimationRunning_{false};

#if REACT_NATIVE_VERSION_MINOR >= 85
  CallbackId animationBackendCallbackId_{0};
#endif

  // Callbacks queued by OperationsLoop via the requestRender_ override when
  // USE_ANIMATION_BACKEND is on. They are drained at the start of each
  // runGrandCallback(AnimationLoop) tick, so the backend plays the role of the
  // platform frame source for the loop.
  std::vector<std::function<void(double)>> pendingFrameCallbacks_;
  AnimatedSensorModule animatedSensorModule_;
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_;
  GetAnimationTimestampFunction getAnimationTimestamp_;
  std::function<void(double)> pendingAnimationFrameCallbackFromWorklets_;

#ifdef __APPLE__
  ForceScreenSnapshotFunction forceScreenSnapshot_;
#endif
  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;
  const std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;
  const std::shared_ptr<OperationsLoop> operationsLoop_;
  const std::shared_ptr<AnimatedPropsRegistry> animatedPropsRegistry_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  const std::shared_ptr<CSSKeyframesRegistry> cssAnimationKeyframesRegistry_;
  const std::shared_ptr<CSSAnimationsRegistry> cssAnimationsRegistry_;
  const std::shared_ptr<CSSTransitionsRegistry> cssTransitionsRegistry_;
  const std::shared_ptr<PseudoStylesRegistry> pseudoStylesRegistry_;

  const SynchronouslyUpdateUIPropsFunction synchronouslyUpdateUIPropsFunction_;
  const PreserveMountedTagsFunction filterUnmountedTagsFunction_;

#ifdef ANDROID
  // Reused across `applySynchronousUpdates` calls to avoid per-frame heap
  // allocations. Access only on the UI thread.
  std::vector<int> synchronousPropsIntBuffer_;
  std::vector<double> synchronousPropsDoubleBuffer_;
#endif // ANDROID

  std::shared_ptr<UIManager> uiManager_;
  std::shared_ptr<LayoutAnimationsProxyCommon> layoutAnimationsProxy_;
  std::shared_ptr<ReanimatedCommitHook> commitHook_;
  std::shared_ptr<ReanimatedMountHook> mountHook_;
  /// Access only on UI thread.
  std::set<SurfaceId> layoutAnimationFlushRequests_;

  const KeyboardEventSubscribeFunction subscribeForKeyboardEventsFunction_;
  const KeyboardEventUnsubscribeFunction unsubscribeFromKeyboardEventsFunction_;

#ifndef NDEBUG
  SingleInstanceChecker<ReanimatedModuleProxy> singleInstanceChecker_;
#endif // NDEBUG
};

} // namespace reanimated
