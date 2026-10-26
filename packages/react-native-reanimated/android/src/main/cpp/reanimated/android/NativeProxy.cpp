#include <react/fabric/Binding.h>
#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/LayoutAnimations/NativeLayoutRoute.h>
#include <reanimated/RuntimeDecorators/RNRuntimeDecorator.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>
#include <reanimated/Tools/ReanimatedVersion.h>
#include <reanimated/android/AnimationFrameCallback.h>
#include <reanimated/android/CSS/AndroidCSSRouteTable.h>
#include <reanimated/android/EventHandler.h>
#include <reanimated/android/KeyboardWorkletWrapper.h>
#include <reanimated/android/NativeProxy.h>
#include <reanimated/android/PseudoSelectorCallback.h>
#include <reanimated/android/SensorSetter.h>

#include <cstdint>
#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace reanimated {

using namespace worklets;
using namespace facebook;
using namespace react;

NativeProxy::NativeProxy(
    jni::alias_ref<NativeProxy::javaobject> jThis, // NOLINT //(performance-unnecessary-value-param)
    jsi::Runtime *rnRuntime,
    const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
    jni::alias_ref<facebook::react::JFabricUIManager::javaobject> fabricUIManager,
    const std::shared_ptr<WorkletRuntime> &uiRuntime,
    const std::shared_ptr<UIScheduler> &uiScheduler)
    : javaPart_(jni::make_global(jThis)), rnRuntime_(rnRuntime), uiRuntime_(uiRuntime) {
#ifndef NDEBUG
  checkJavaVersion();
  injectCppVersion();
#endif // NDEBUG
  const auto &uiManager = fabricUIManager->getBinding()->getScheduler()->getUIManager();
  std::shared_ptr<native_animation::NativeAnimationHost> nativeAnimationHost;
  std::shared_ptr<css::CSSPlatformTransitionBackend> platformTransitionBackend;
  if constexpr (
      StaticFeatureFlags::getFlag("ANDROID_CSS_PLATFORM_TRANSITIONS") || reanimated::hasNativeLayoutRouteFlag()) {
    nativeAnimationPlatform_ = native_animation::AndroidNativeAnimationPlatform::create(
        getNativeAnimationExecutor(), uiManager, bindThis(&NativeProxy::getAnimationTimestamp));
    nativeAnimationHost = native_animation::NativeAnimationHost::create(nativeAnimationPlatform_);
  }
  if constexpr (StaticFeatureFlags::getFlag("ANDROID_CSS_PLATFORM_TRANSITIONS")) {
    platformTransitionBackend = css::makeCSSHostTransitionBackend(
        nativeAnimationHost,
        css::makeAndroidCSSRouteTable(nativeAnimationPlatform_->apiLevel(), [platform = nativeAnimationPlatform_] {
          return platform->animatorsEnabled();
        }));
  }
  const auto platformDepMethodsHolder = getPlatformDependentMethods(platformTransitionBackend, nativeAnimationHost);
  reanimatedModuleProxy_ = std::make_shared<ReanimatedModuleProxy>(
      uiRuntime, uiScheduler, *rnRuntime, jsCallInvoker, platformDepMethodsHolder, getIsReducedMotion());
  reanimatedModuleProxy_->init(platformDepMethodsHolder);
  reanimatedModuleProxy_->initializeFabric(uiManager);
  registerEventHandler();
  // removed temporarily, event listener mechanism needs to be fixed on RN side
  // eventListener_ = std::make_shared<EventListener>(
  //     [reanimatedModuleProxy,
  //      getAnimationTimestamp](const RawEvent &rawEvent) {
  //       return reanimatedModuleProxy->handleRawEvent(
  //           rawEvent, getAnimationTimestamp());
  //     });
  // reactScheduler_ = binding->getScheduler();
  // reactScheduler_->addEventListener(eventListener_);
}

NativeProxy::~NativeProxy() {
  // removed temporary, new event listener mechanism need fix on the RN side
  // reactScheduler_->removeEventListener(eventListener_);
}

jni::local_ref<NativeProxy::jhybriddata> NativeProxy::initHybrid(
    jni::alias_ref<jhybridobject> jThis, // NOLINT //(performance-unnecessary-value-param)
    jlong jsContext,
    jni::alias_ref<facebook::react::CallInvokerHolder::javaobject> jsCallInvokerHolder,
    jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        fabricUIManager) // NOLINT //(performance-unnecessary-value-param)
{
  auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
  auto &rnRuntime = *reinterpret_cast<jsi::Runtime *>(jsContext); // NOLINT //(performance-no-int-to-ptr)
  const auto global = rnRuntime.global();
  const auto uiRuntime =
      getWorkletRuntimeFromHolder(rnRuntime, global.getPropertyAsObject(rnRuntime, "__UI_WORKLET_RUNTIME_HOLDER"));

  const auto uiScheduler =
      getUISchedulerFromHolder(rnRuntime, global.getPropertyAsObject(rnRuntime, "__UI_SCHEDULER_HOLDER"));

  return makeCxxInstance(jThis, &rnRuntime, jsCallInvoker, fabricUIManager, uiRuntime, uiScheduler);
}

#ifndef NDEBUG
void NativeProxy::checkJavaVersion() {
  std::string javaVersion;
  try {
    javaVersion = getJniMethod<jstring()>("getReanimatedJavaVersion")(javaPart_.get())->toStdString();
  } catch (std::exception &) {
    throw std::runtime_error(
        std::string("[Reanimated] C++ side failed to resolve Java code version.\n") +
        "See `https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#c-side-failed-to-resolve-java-code-version` for more details.");
  }

  auto cppVersion = getReanimatedCppVersion();
  if (cppVersion != javaVersion) {
    throw std::runtime_error(
        std::string("[Reanimated] Mismatch between C++ code version and Java code version (") + cppVersion + " vs. " +
        javaVersion + " respectively).\n" +
        "See `https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#mismatch-between-c-code-version-and-java-code-version` for more details.");
  }
}

void NativeProxy::injectCppVersion() {
  auto cppVersion = getReanimatedCppVersion();
  try {
    static const auto method = getJniMethod<void(jni::local_ref<JString>)>("setCppVersion");
    method(javaPart_.get(), make_jstring(cppVersion));
  } catch (std::exception &) {
    throw std::runtime_error(
        std::string("[Reanimated] C++ side failed to resolve Java code version (injection).\n") +
        "See `https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#c-side-failed-to-resolve-java-code-version` for more details.");
  }
}
#endif // NDEBUG

void NativeProxy::installJSIBindings() {
  jsi::Runtime &rnRuntime = *rnRuntime_;
  auto &uiRuntime = getJSIRuntimeFromWorkletRuntime(uiRuntime_);
  RNRuntimeDecorator::decorate(rnRuntime, uiRuntime, reanimatedModuleProxy_);
}

bool NativeProxy::isAnyHandlerWaitingForEvent(const std::string &eventName, const int emitterReactTag) {
  return reanimatedModuleProxy_->isAnyHandlerWaitingForEvent(eventName, emitterReactTag);
}

void NativeProxy::performOperations() {
  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
    // We don't use performOperations in the backend path,
    // but we don't have access to the feature flags in Kotlin, so we gate it here
  } else {
    reanimatedModuleProxy_->performOperations();
  }
}

void NativeProxy::performNonLayoutOperations() {
  reanimatedModuleProxy_->performNonLayoutOperations();
}

bool NativeProxy::hasSynchronousWritesTracker() {
  return reanimatedModuleProxy_->hasSynchronousWritesTracker();
}

void NativeProxy::rewriteSynchronousProps() {
  reanimatedModuleProxy_->rewriteSynchronousProps();
}

bool NativeProxy::hasNativeAnimationPlatform() {
  return nativeAnimationPlatform_ != nullptr;
}

bool NativeProxy::hasNativeLayoutRouteFlag() {
  return reanimated::hasNativeLayoutRouteFlag();
}

void NativeProxy::nativeAnimationsWillMountItems() {
  nativeAnimationPlatform_->willMountItems();
}

void NativeProxy::nativeAnimationsDidMountItems() {
  nativeAnimationPlatform_->didMountItems(
      [this](const std::uint64_t dispatch) { reanimatedModuleProxy_->pulledSurfacesDidMount(dispatch); });
}

#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
void NativeProxy::failNextNativeAnimationViewLookup(const int tag) {
  nativeAnimationPlatform_->failNextViewLookup(tag);
}

jni::local_ref<jni::JArrayLong> NativeProxy::takeNativeAnimationViewLookupFailure() {
  return nativeAnimationPlatform_->takeViewLookupFailure();
}
#endif

bool NativeProxy::getIsReducedMotion() {
  static const auto method = getJniMethod<jboolean()>("getIsReducedMotion");
  return method(javaPart_.get());
}

void NativeProxy::toggleSlowAnimationsOnUIRuntime() {
  reanimatedModuleProxy_->toggleSlowAnimationsOnUIRuntime();
}

void NativeProxy::registerNatives() {
  registerHybrid(
      {makeNativeMethod("initHybrid", NativeProxy::initHybrid),
       makeNativeMethod("installJSIBindings", NativeProxy::installJSIBindings),
       makeNativeMethod("isAnyHandlerWaitingForEventCpp", NativeProxy::isAnyHandlerWaitingForEvent),
       makeNativeMethod("performOperationsCpp", NativeProxy::performOperations),
       makeNativeMethod("performNonLayoutOperationsCpp", NativeProxy::performNonLayoutOperations),
       makeNativeMethod("hasSynchronousWritesTracker", NativeProxy::hasSynchronousWritesTracker),
       makeNativeMethod("rewriteSynchronousProps", NativeProxy::rewriteSynchronousProps),
       makeNativeMethod("hasNativeAnimationPlatform", NativeProxy::hasNativeAnimationPlatform),
       makeNativeMethod("hasNativeLayoutRouteFlag", NativeProxy::hasNativeLayoutRouteFlag),
       makeNativeMethod("nativeAnimationsWillMountItems", NativeProxy::nativeAnimationsWillMountItems),
       makeNativeMethod("nativeAnimationsDidMountItems", NativeProxy::nativeAnimationsDidMountItems),
       makeNativeMethod("invalidateCpp", NativeProxy::invalidateCpp),
       makeNativeMethod("toggleSlowAnimationsOnUIRuntime", NativeProxy::toggleSlowAnimationsOnUIRuntime)});
#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
  javaClassStatic()->registerNatives({
      makeNativeMethod("failNextNativeAnimationViewLookupCpp", NativeProxy::failNextNativeAnimationViewLookup),
      makeNativeMethod("takeNativeAnimationViewLookupFailureCpp", NativeProxy::takeNativeAnimationViewLookupFailure),
  });
#endif
}

void NativeProxy::requestRender(std::function<void(double)> onRender) {
  static const auto method = getJniMethod<void(AnimationFrameCallback::javaobject)>("requestRender");
  method(javaPart_.get(), AnimationFrameCallback::newObjectCxxArgs(std::move(onRender)).get());
}

void NativeProxy::registerEventHandler() {
  auto eventHandler = bindThis(&NativeProxy::handleEvent);
  static const auto method = getJniMethod<void(EventHandler::javaobject)>("registerEventHandler");
  method(javaPart_.get(), EventHandler::newObjectCxxArgs(std::move(eventHandler)).get());
}

void NativeProxy::maybeFlushUIUpdatesQueue() {
  // Module might be already destroyed.
  if (!javaPart_) {
    return;
  }

  static const auto method = getJniMethod<void()>("maybeFlushUIUpdatesQueue");
  method(javaPart_.get());
}

std::optional<std::unique_ptr<int[]>> NativeProxy::preserveMountedTags(std::vector<int> &tags) {
  if (tags.empty()) {
    return {};
  }

  static const auto method = getJniMethod<jboolean(jni::alias_ref<jni::JArrayInt>)>("preserveMountedTags");
  auto jArrayInt = jni::JArrayInt::newArray(tags.size());
  jArrayInt->setRegion(0, tags.size(), tags.data());

  if (!method(javaPart_.get(), jArrayInt)) {
    return {};
  }

  auto region = jArrayInt->getRegion(0, tags.size());
  return region;
}

void NativeProxy::synchronouslyUpdateUIProps(
    const std::vector<int> &intBuffer,
    const std::vector<double> &doubleBuffer) {
  static const auto method = getJniMethod<void(jni::alias_ref<jni::JArrayInt>, jni::alias_ref<jni::JArrayDouble>)>(
      "synchronouslyUpdateUIProps");
  auto jArrayInt = jni::JArrayInt::newArray(intBuffer.size());
  auto jArrayDouble = jni::JArrayDouble::newArray(doubleBuffer.size());
  jArrayInt->setRegion(0, intBuffer.size(), intBuffer.data());
  jArrayDouble->setRegion(0, doubleBuffer.size(), doubleBuffer.data());
  method(javaPart_.get(), jArrayInt, jArrayDouble);
}

int NativeProxy::registerSensor(int sensorType, int interval, int, std::function<void(double[], int)> setter) {
  static const auto method = getJniMethod<int(int, int, SensorSetter::javaobject)>("registerSensor");
  return method(javaPart_.get(), sensorType, interval, SensorSetter::newObjectCxxArgs(std::move(setter)).get());
}
void NativeProxy::unregisterSensor(int sensorId) {
  static const auto method = getJniMethod<void(int)>("unregisterSensor");
  method(javaPart_.get(), sensorId);
}

void NativeProxy::setGestureState(int handlerTag, int newState) {
  static const auto method = getJniMethod<void(int, int)>("setGestureState");
  method(javaPart_.get(), handlerTag, newState);
}

int NativeProxy::subscribeForKeyboardEvents(
    std::function<void(int, int)> callback,
    bool isStatusBarTranslucent,
    bool isNavigationBarTranslucent) {
  static const auto method =
      getJniMethod<int(KeyboardWorkletWrapper::javaobject, bool, bool)>("subscribeForKeyboardEvents");
  return method(
      javaPart_.get(),
      KeyboardWorkletWrapper::newObjectCxxArgs(std::move(callback)).get(),
      isStatusBarTranslucent,
      isNavigationBarTranslucent);
}

void NativeProxy::unsubscribeFromKeyboardEvents(int listenerId) {
  static const auto method = getJniMethod<void(int)>("unsubscribeFromKeyboardEvents");
  method(javaPart_.get(), listenerId);
}

void NativeProxy::attachPseudoSelector(Tag tag, PseudoSelector selector, std::function<void(bool)> callback) {
  static const auto method = getJniMethod<void(int, int, PseudoSelectorCallback::javaobject)>("attachPseudoSelector");
  method(
      javaPart_.get(),
      static_cast<int>(tag),
      static_cast<int>(selector),
      PseudoSelectorCallback::newObjectCxxArgs(std::move(callback)).get());
}

void NativeProxy::detachPseudoSelector(Tag tag, PseudoSelector selector) {
  static const auto method = getJniMethod<void(int, int)>("detachPseudoSelector");
  method(javaPart_.get(), static_cast<int>(tag), static_cast<int>(selector));
}

jni::local_ref<native_animation::JNativeAnimationExecutor::javaobject> NativeProxy::getNativeAnimationExecutor() {
  static const auto method =
      getJniMethod<native_animation::JNativeAnimationExecutor::javaobject()>("getNativeAnimationExecutor");
  return method(javaPart_.get());
}

double NativeProxy::getAnimationTimestamp() {
  static const auto method = getJniMethod<jlong()>("getAnimationTimestamp");
  jlong output = method(javaPart_.get());
  return static_cast<double>(output);
}

void NativeProxy::handleEvent(
    jni::alias_ref<JString> eventName,
    jint emitterReactTag,
    jni::alias_ref<react::WritableMap> event,
    jboolean isInDrawPass) {
  // handles RCTEvents from RNGestureHandler
  if (event.get() == nullptr) {
    // Ignore events with null payload.
    return;
  }
  // TODO: convert event directly to jsi::Value without JSON serialization
  std::string eventAsString;
  try {
    eventAsString = event->toString();
  } catch (...) {
    // Events from other libraries may contain NaN or INF values which
    // cannot be represented in JSON. See
    // https://github.com/software-mansion/react-native-reanimated/issues/1776
    // for details.
    return;
  }
  std::string eventJSON = eventAsString;
  if (eventJSON == "null") {
    return;
  }

  auto &uiRuntime = getJSIRuntimeFromWorkletRuntime(uiRuntime_);
  jsi::Value payload;
  try {
    payload = jsi::Value::createFromJsonUtf8(uiRuntime, reinterpret_cast<uint8_t *>(&eventJSON[0]), eventJSON.size());
  } catch (...) {
    // Ignore events with malformed JSON payload.
    return;
  }

  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
    reanimatedModuleProxy_->handleEventAndFlush(
        eventName->toString(),
        emitterReactTag,
        payload,
        isInDrawPass ? GrandCallbackSource::EventInAndroidDraw : GrandCallbackSource::Event);
  } else {
    reanimatedModuleProxy_->handleEvent(eventName->toString(), emitterReactTag, payload, getAnimationTimestamp());
  }
}

PlatformDepMethodsHolder NativeProxy::getPlatformDependentMethods(
    const std::shared_ptr<css::CSSPlatformTransitionBackend> &platformTransitionBackend,
    const std::shared_ptr<native_animation::NativeAnimationHost> &nativeAnimationHost) {
  auto getAnimationTimestamp = bindThis(&NativeProxy::getAnimationTimestamp);

  auto requestRender = bindThis(&NativeProxy::requestRender);

  auto preserveMountedTags = bindThis(&NativeProxy::preserveMountedTags);

  auto synchronouslyUpdateUIPropsFunction = bindThis(&NativeProxy::synchronouslyUpdateUIProps);

  auto registerSensorFunction = bindThis(&NativeProxy::registerSensor);

  auto unregisterSensorFunction = bindThis(&NativeProxy::unregisterSensor);

  auto setGestureStateFunction = bindThis(&NativeProxy::setGestureState);

  auto subscribeForKeyboardEventsFunction = bindThis(&NativeProxy::subscribeForKeyboardEvents);

  auto unsubscribeFromKeyboardEventsFunction = bindThis(&NativeProxy::unsubscribeFromKeyboardEvents);

  auto maybeFlushUiUpdatesQueueFunction = bindThis(&NativeProxy::maybeFlushUIUpdatesQueue);

  auto attachPseudoSelectorFunction = bindThis(&NativeProxy::attachPseudoSelector);

  auto detachPseudoSelectorFunction = bindThis(&NativeProxy::detachPseudoSelector);

  return {
      requestRender,
      preserveMountedTags,
      synchronouslyUpdateUIPropsFunction,
      getAnimationTimestamp,
      registerSensorFunction,
      unregisterSensorFunction,
      setGestureStateFunction,
      subscribeForKeyboardEventsFunction,
      unsubscribeFromKeyboardEventsFunction,
      maybeFlushUiUpdatesQueueFunction,
      attachPseudoSelectorFunction,
      detachPseudoSelectorFunction,
      platformTransitionBackend,
      nativeAnimationHost,
  };
}

void NativeProxy::invalidateCpp() {
  ReanimatedSystraceSection section("NativeProxy::invalidateCpp");
  if (nativeAnimationPlatform_) {
    nativeAnimationPlatform_->close();
    nativeAnimationPlatform_.reset();
  }
  uiRuntime_.reset();
  // cleanup all animated sensors here, since the next line resets
  // the pointer and it will be too late after it
  reanimatedModuleProxy_->cleanupSensors();
  reanimatedModuleProxy_.reset();
  javaPart_ = nullptr;
}

} // namespace reanimated
