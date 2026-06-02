#include <jsi/JSIDynamic.h>
#include <react/fabric/Binding.h>
#include <react/jni/WritableNativeMap.h>
#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/RuntimeDecorators/RNRuntimeDecorator.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>
#include <reanimated/Tools/ReanimatedVersion.h>
#include <reanimated/android/AnimationFrameCallback.h>
#include <reanimated/android/EventHandler.h>
#include <reanimated/android/KeyboardWorkletWrapper.h>
#include <reanimated/android/NativeProxy.h>
#include <reanimated/android/PseudoSelectorCallback.h>
#include <reanimated/android/SensorSetter.h>

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
    : alive_(std::make_shared<std::atomic<bool>>(true)),
      javaPart_(jni::make_global(jThis)),
      rnRuntime_(rnRuntime),
      uiRuntime_(uiRuntime),
      reanimatedModuleProxy_(std::make_shared<ReanimatedModuleProxy>(
          uiRuntime,
          uiScheduler,
          *rnRuntime,
          jsCallInvoker,
          getPlatformDependentMethods(),
          getIsReducedMotion())) {
  // Run the version handshake in both debug and release. The check is a
  // single JNI call at init and surfaces install-skew issues that otherwise
  // fail mysteriously deeper in the call chain.
  checkJavaVersion();
  injectCppVersion();
  reanimatedModuleProxy_->init(getPlatformDependentMethods());
  const auto &uiManager = fabricUIManager->getBinding()->getScheduler()->getUIManager();
  reanimatedModuleProxy_->initializeFabric(uiManager);
  registerEventHandler();
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

void NativeProxy::installJSIBindings() {
  if (!reanimatedModuleProxy_) {
    return;
  }
  jsi::Runtime &rnRuntime = *rnRuntime_;
  auto &uiRuntime = getJSIRuntimeFromWorkletRuntime(uiRuntime_);
  RNRuntimeDecorator::decorate(rnRuntime, uiRuntime, reanimatedModuleProxy_);
}

bool NativeProxy::isAnyHandlerWaitingForEvent(const std::string &eventName, const int emitterReactTag) {
  if (!reanimatedModuleProxy_) {
    return false;
  }
  return reanimatedModuleProxy_->isAnyHandlerWaitingForEvent(eventName, emitterReactTag);
}

void NativeProxy::performOperations() {
  if (!reanimatedModuleProxy_) {
    return;
  }
  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
    // We don't use performOperations in the backend path,
    // but we don't have access to the feature flags in Kotlin, so we gate it here
  } else {
    reanimatedModuleProxy_->performOperations();
  }
}

void NativeProxy::performNonLayoutOperations() {
  if (!reanimatedModuleProxy_) {
    return;
  }
  reanimatedModuleProxy_->performNonLayoutOperations();
}

bool NativeProxy::getIsReducedMotion() {
  if (!javaPart_) {
    return false;
  }
  static const auto method = getJniMethod<jboolean()>("getIsReducedMotion");
  return method(javaPart_.get());
}

void NativeProxy::toggleSlowAnimationsOnUIRuntime() {
  if (!reanimatedModuleProxy_) {
    return;
  }
  reanimatedModuleProxy_->toggleSlowAnimationsOnUIRuntime();
}

void NativeProxy::registerNatives() {
  registerHybrid(
      {makeNativeMethod("initHybrid", NativeProxy::initHybrid),
       makeNativeMethod("installJSIBindings", NativeProxy::installJSIBindings),
       makeNativeMethod("isAnyHandlerWaitingForEvent", NativeProxy::isAnyHandlerWaitingForEvent),
       makeNativeMethod("performOperations", NativeProxy::performOperations),
       makeNativeMethod("performNonLayoutOperations", NativeProxy::performNonLayoutOperations),
       makeNativeMethod("invalidateCpp", NativeProxy::invalidateCpp),
       makeNativeMethod("toggleSlowAnimationsOnUIRuntime", NativeProxy::toggleSlowAnimationsOnUIRuntime)});
}

void NativeProxy::requestRender(std::function<void(double)> onRender) {
  static const auto method = getJniMethod<void(AnimationFrameCallback::javaobject)>("requestRender");
  method(javaPart_.get(), AnimationFrameCallback::newObjectCxxArgs(std::move(onRender)).get());
}

void NativeProxy::registerEventHandler() {
  if (!javaPart_) {
    return;
  }
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
  if (!javaPart_) {
    return -1;
  }
  static const auto method = getJniMethod<int(int, int, SensorSetter::javaobject)>("registerSensor");
  return method(javaPart_.get(), sensorType, interval, SensorSetter::newObjectCxxArgs(std::move(setter)).get());
}
void NativeProxy::unregisterSensor(int sensorId) {
  if (!javaPart_) {
    return;
  }
  static const auto method = getJniMethod<void(int)>("unregisterSensor");
  method(javaPart_.get(), sensorId);
}

void NativeProxy::setGestureState(int handlerTag, int newState) {
  if (!javaPart_) {
    return;
  }
  static const auto method = getJniMethod<void(int, int)>("setGestureState");
  method(javaPart_.get(), handlerTag, newState);
}

int NativeProxy::subscribeForKeyboardEvents(
    std::function<void(int, int)> callback,
    bool isStatusBarTranslucent,
    bool isNavigationBarTranslucent) {
  if (!javaPart_) {
    return -1;
  }
  static const auto method =
      getJniMethod<int(KeyboardWorkletWrapper::javaobject, bool, bool)>("subscribeForKeyboardEvents");
  return method(
      javaPart_.get(),
      KeyboardWorkletWrapper::newObjectCxxArgs(std::move(callback)).get(),
      isStatusBarTranslucent,
      isNavigationBarTranslucent);
}

void NativeProxy::unsubscribeFromKeyboardEvents(int listenerId) {
  if (!javaPart_) {
    return;
  }
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

double NativeProxy::getAnimationTimestamp() {
  if (!javaPart_) {
    return 0.0;
  }
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
  if (!reanimatedModuleProxy_ || !uiRuntime_) {
    return;
  }
  if (event.get() == nullptr) {
    // Ignore events with null payload.
    return;
  }

  if (!event->isInstanceOf(react::WritableNativeMap::javaClassStatic())) {
    return;
  }

  auto nativeMap = jni::static_ref_cast<react::WritableNativeMap::javaobject>(jni::static_ref_cast<jobject>(event));
  auto eventPayload = nativeMap->cthis()->consume();
  if (eventPayload.isNull()) {
    return;
  }

  auto &uiRuntime = getJSIRuntimeFromWorkletRuntime(uiRuntime_);
  jsi::Value payload = jsi::valueFromDynamic(uiRuntime, eventPayload);

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

PlatformDepMethodsHolder NativeProxy::getPlatformDependentMethods() {
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
  };
}

void NativeProxy::invalidateCpp() {
  // Flip the shared flag first so any callback lambdas captured via
  // `bindThis` short-circuit before touching `this`.
  alive_->store(false, std::memory_order_release);
  uiRuntime_.reset();
  // cleanup all animated sensors here, since the next line resets
  // the pointer and it will be too late after it
  if (reanimatedModuleProxy_) {
    reanimatedModuleProxy_->cleanupSensors();
  }
  javaPart_ = nullptr;
  reanimatedModuleProxy_.reset();
}

} // namespace reanimated
