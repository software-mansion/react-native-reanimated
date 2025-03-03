#include <reanimated/RuntimeDecorators/RNRuntimeDecorator.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>
#include <reanimated/Tools/ReanimatedVersion.h>
#include <reanimated/android/KeyboardWorkletWrapper.h>
#include <reanimated/android/NativeProxy.h>

#include <worklets/WorkletRuntime/WorkletRuntimeCollector.h>

#include <react/fabric/Binding.h>

namespace reanimated {

using namespace facebook;
using namespace react;

NativeProxy::NativeProxy(
    jni::alias_ref<NativeProxy::javaobject> jThis,
    const std::shared_ptr<WorkletsModuleProxy> &workletsModuleProxy,
    jsi::Runtime *rnRuntime,
    const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
    jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        fabricUIManager)
    : javaPart_(jni::make_global(jThis)),
      rnRuntime_(rnRuntime),
      workletsModuleProxy_(workletsModuleProxy),
      reanimatedModuleProxy_(std::make_shared<ReanimatedModuleProxy>(
          workletsModuleProxy,
          *rnRuntime,
          jsCallInvoker,
          getPlatformDependentMethods(),
          getIsReducedMotion())) {
  reanimatedModuleProxy_->init(getPlatformDependentMethods());
  commonInit(fabricUIManager);
}

void NativeProxy::commonInit(
    jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        &fabricUIManager) {
  const auto &uiManager =
      fabricUIManager->getBinding()->getScheduler()->getUIManager();
  reanimatedModuleProxy_->initializeFabric(uiManager);
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

  // cleanup all animated sensors here, since NativeProxy
  // has already been destroyed when AnimatedSensorModule's
  // destructor is ran
  reanimatedModuleProxy_->cleanupSensors();
}

jni::local_ref<NativeProxy::jhybriddata> NativeProxy::initHybrid(
    jni::alias_ref<jhybridobject> jThis,
    jni::alias_ref<WorkletsModule::javaobject> jWorkletsModule,
    jlong jsContext,
    jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
        jsCallInvokerHolder,
    jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        fabricUIManager) {
  auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
  auto workletsModuleProxy = jWorkletsModule->cthis()->getWorkletsModuleProxy();
  return makeCxxInstance(
      jThis,
      workletsModuleProxy,
      (jsi::Runtime *)jsContext,
      jsCallInvoker,
      fabricUIManager);
}

#ifndef NDEBUG
void NativeProxy::checkJavaVersion(jsi::Runtime &rnRuntime) {
  std::string javaVersion;
  try {
    javaVersion =
        getJniMethod<jstring()>("getReanimatedJavaVersion")(javaPart_.get())
            ->toStdString();
  } catch (std::exception &) {
    throw std::runtime_error(
        std::string(
            "[Reanimated] C++ side failed to resolve Java code version.\n") +
        "See `https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#c-side-failed-to-resolve-java-code-version` for more details.");
  }

  auto cppVersion = getReanimatedCppVersion();
  if (cppVersion != javaVersion) {
    throw std::runtime_error(
        std::string(
            "[Reanimated] Mismatch between C++ code version and Java code version (") +
        cppVersion + " vs. " + javaVersion + " respectively).\n" +
        "See `https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#mismatch-between-c-code-version-and-java-code-version` for more details.");
  }
}

void NativeProxy::injectCppVersion() {
  auto cppVersion = getReanimatedCppVersion();
  try {
    static const auto method =
        getJniMethod<void(jni::local_ref<JString>)>("setCppVersion");
    method(javaPart_.get(), make_jstring(cppVersion));
  } catch (std::exception &) {
    throw std::runtime_error(
        std::string(
            "[Reanimated] C++ side failed to resolve Java code version (injection).\n") +
        "See `https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#c-side-failed-to-resolve-java-code-version` for more details.");
  }
}
#endif // NDEBUG

void NativeProxy::installJSIBindings() {
  jsi::Runtime &rnRuntime = *rnRuntime_;
  WorkletRuntimeCollector::install(rnRuntime);
  RNRuntimeDecorator::decorate(
      rnRuntime,
      workletsModuleProxy_->getUIWorkletRuntime()->getJSIRuntime(),
      reanimatedModuleProxy_);
#ifndef NDEBUG
  checkJavaVersion(rnRuntime);
  injectCppVersion();
#endif // NDEBUG

  registerEventHandler();
}

bool NativeProxy::isAnyHandlerWaitingForEvent(
    const std::string &eventName,
    const int emitterReactTag) {
  return reanimatedModuleProxy_->isAnyHandlerWaitingForEvent(
      eventName, emitterReactTag);
}

void NativeProxy::performOperations() {
  reanimatedModuleProxy_->performOperations();
}

bool NativeProxy::getIsReducedMotion() {
  static const auto method = getJniMethod<jboolean()>("getIsReducedMotion");
  return method(javaPart_.get());
}

void NativeProxy::registerNatives() {
  registerHybrid(
      {makeNativeMethod("initHybrid", NativeProxy::initHybrid),
       makeNativeMethod("installJSIBindings", NativeProxy::installJSIBindings),
       makeNativeMethod(
           "isAnyHandlerWaitingForEvent",
           NativeProxy::isAnyHandlerWaitingForEvent),
       makeNativeMethod("performOperations", NativeProxy::performOperations),
       makeNativeMethod("invalidateCpp", NativeProxy::invalidateCpp)});
}

void NativeProxy::requestRender(std::function<void(double)> onRender) {
  static const auto method =
      getJniMethod<void(AnimationFrameCallback::javaobject)>("requestRender");
  method(
      javaPart_.get(),
      AnimationFrameCallback::newObjectCxxArgs(std::move(onRender)).get());
}

void NativeProxy::registerEventHandler() {
  auto eventHandler = bindThis(&NativeProxy::handleEvent);
  static const auto method =
      getJniMethod<void(EventHandler::javaobject)>("registerEventHandler");
  method(
      javaPart_.get(),
      EventHandler::newObjectCxxArgs(std::move(eventHandler)).get());
}

void NativeProxy::maybeFlushUIUpdatesQueue() {
  // Module might be already destroyed.
  if (!javaPart_) {
    return;
  }

  static const auto method = getJniMethod<void()>("maybeFlushUIUpdatesQueue");
  method(javaPart_.get());
}

int NativeProxy::registerSensor(
    int sensorType,
    int interval,
    int,
    std::function<void(double[], int)> setter) {
  static const auto method =
      getJniMethod<int(int, int, SensorSetter::javaobject)>("registerSensor");
  return method(
      javaPart_.get(),
      sensorType,
      interval,
      SensorSetter::newObjectCxxArgs(std::move(setter)).get());
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
      getJniMethod<int(KeyboardWorkletWrapper::javaobject, bool, bool)>(
          "subscribeForKeyboardEvents");
  return method(
      javaPart_.get(),
      KeyboardWorkletWrapper::newObjectCxxArgs(std::move(callback)).get(),
      isStatusBarTranslucent,
      isNavigationBarTranslucent);
}

void NativeProxy::unsubscribeFromKeyboardEvents(int listenerId) {
  static const auto method =
      getJniMethod<void(int)>("unsubscribeFromKeyboardEvents");
  method(javaPart_.get(), listenerId);
}

double NativeProxy::getAnimationTimestamp() {
  static const auto method = getJniMethod<jlong()>("getAnimationTimestamp");
  jlong output = method(javaPart_.get());
  return static_cast<double>(output);
}

void NativeProxy::handleEvent(
    jni::alias_ref<JString> eventName,
    jint emitterReactTag,
    jni::alias_ref<react::WritableMap> event) {
  // handles RCTEvents from RNGestureHandler
  if (event.get() == nullptr) {
    // Ignore events with null payload.
    return;
  }
  // TODO: convert event directly to jsi::Value without JSON serialization
  std::string eventAsString;
  try {
    eventAsString = event->toString();
  } catch (std::exception &) {
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

  jsi::Runtime &rt =
      workletsModuleProxy_->getUIWorkletRuntime()->getJSIRuntime();
  jsi::Value payload;
  try {
    payload = jsi::Value::createFromJsonUtf8(
        rt, reinterpret_cast<uint8_t *>(&eventJSON[0]), eventJSON.size());
  } catch (std::exception &) {
    // Ignore events with malformed JSON payload.
    return;
  }

  reanimatedModuleProxy_->handleEvent(
      eventName->toString(), emitterReactTag, payload, getAnimationTimestamp());
}

PlatformDepMethodsHolder NativeProxy::getPlatformDependentMethods() {
  auto getAnimationTimestamp = bindThis(&NativeProxy::getAnimationTimestamp);

  auto requestRender = bindThis(&NativeProxy::requestRender);

  auto registerSensorFunction = bindThis(&NativeProxy::registerSensor);

  auto unregisterSensorFunction = bindThis(&NativeProxy::unregisterSensor);

  auto setGestureStateFunction = bindThis(&NativeProxy::setGestureState);

  auto subscribeForKeyboardEventsFunction =
      bindThis(&NativeProxy::subscribeForKeyboardEvents);

  auto unsubscribeFromKeyboardEventsFunction =
      bindThis(&NativeProxy::unsubscribeFromKeyboardEvents);

  auto maybeFlushUiUpdatesQueueFunction =
      bindThis(&NativeProxy::maybeFlushUIUpdatesQueue);

  return {
      requestRender,
      getAnimationTimestamp,
      registerSensorFunction,
      unregisterSensorFunction,
      setGestureStateFunction,
      subscribeForKeyboardEventsFunction,
      unsubscribeFromKeyboardEventsFunction,
      maybeFlushUiUpdatesQueueFunction,
  };
}

void NativeProxy::invalidateCpp() {
  workletsModuleProxy_.reset();
  reanimatedModuleProxy_.reset();
}

} // namespace reanimated
