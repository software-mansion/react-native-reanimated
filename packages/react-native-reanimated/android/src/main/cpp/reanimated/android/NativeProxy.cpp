#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/RuntimeDecorators/RNRuntimeDecorator.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>
#include <reanimated/android/NativeProxy.h>

#include <worklets/Tools/ReanimatedJSIUtils.h>
#include <worklets/Tools/ReanimatedVersion.h>
#include <worklets/WorkletRuntime/ReanimatedRuntime.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>
#include <worklets/WorkletRuntime/WorkletRuntimeCollector.h>
#include <worklets/android/AndroidUIScheduler.h>

#include <android/log.h>
#include <fbjni/fbjni.h>
#include <jsi/JSIDynamic.h>
#include <jsi/jsi.h>
#include <react/jni/ReadableNativeArray.h>
#include <react/jni/ReadableNativeMap.h>

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/fabric/Binding.h>
#endif

namespace reanimated {

using namespace facebook;
using namespace react;

NativeProxy::NativeProxy(
    jni::alias_ref<NativeProxy::javaobject> jThis,
    const std::shared_ptr<WorkletsModuleProxy> &workletsModuleProxy,
    jsi::Runtime *rnRuntime,
    const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
    jni::global_ref<LayoutAnimations::javaobject> layoutAnimations,
    const bool isBridgeless
#ifdef RCT_NEW_ARCH_ENABLED
    ,
    jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        fabricUIManager
#endif
    )
    : javaPart_(jni::make_global(jThis)),
      rnRuntime_(rnRuntime),
      reanimatedModuleProxy_(std::make_shared<ReanimatedModuleProxy>(
          workletsModuleProxy,
          *rnRuntime,
          jsCallInvoker,
          getPlatformDependentMethods(),
          isBridgeless,
          getIsReducedMotion())),
      layoutAnimations_(std::move(layoutAnimations)) {
  reanimatedModuleProxy_->init(getPlatformDependentMethods());
#ifdef RCT_NEW_ARCH_ENABLED
  commonInit(fabricUIManager);
#endif // RCT_NEW_ARCH_ENABLED
}

#ifdef RCT_NEW_ARCH_ENABLED
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
#endif // RCT_NEW_ARCH_ENABLED

NativeProxy::~NativeProxy() {
  // removed temporary, new event listener mechanism need fix on the RN side
  // reactScheduler_->removeEventListener(eventListener_);
}

jni::local_ref<NativeProxy::jhybriddata> NativeProxy::initHybrid(
    jni::alias_ref<jhybridobject> jThis,
    jni::alias_ref<WorkletsModule::javaobject> jWorkletsModule,
    jlong jsContext,
    jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
        jsCallInvokerHolder,
    jni::alias_ref<LayoutAnimations::javaobject> layoutAnimations,
    bool isBridgeless
#ifdef RCT_NEW_ARCH_ENABLED
    ,
    jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        fabricUIManager
#endif
) {
  auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
  auto workletsModuleProxy = jWorkletsModule->cthis()->getWorkletsModuleProxy();
  return makeCxxInstance(
      jThis,
      workletsModuleProxy,
      (jsi::Runtime *)jsContext,
      jsCallInvoker,
      make_global(layoutAnimations),
      isBridgeless
#ifdef RCT_NEW_ARCH_ENABLED
      ,
      fabricUIManager
#endif
  );
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
  RNRuntimeDecorator::decorate(rnRuntime, reanimatedModuleProxy_);
#ifndef NDEBUG
  checkJavaVersion(rnRuntime);
  injectCppVersion();
#endif // NDEBUG

  registerEventHandler();
  setupLayoutAnimations();
}

bool NativeProxy::isAnyHandlerWaitingForEvent(
    const std::string &eventName,
    const int emitterReactTag) {
  return reanimatedModuleProxy_->isAnyHandlerWaitingForEvent(
      eventName, emitterReactTag);
}

void NativeProxy::performOperations() {
#ifdef RCT_NEW_ARCH_ENABLED
  reanimatedModuleProxy_->performOperations();
#endif
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

#ifdef RCT_NEW_ARCH_ENABLED
// nothing
#else
jsi::Value NativeProxy::obtainProp(
    jsi::Runtime &rt,
    const int viewTag,
    const jsi::Value &propName) {
  static const auto method =
      getJniMethod<jni::local_ref<JString>(int, jni::local_ref<JString>)>(
          "obtainProp");
  local_ref<JString> propNameJStr =
      jni::make_jstring(propName.asString(rt).utf8(rt).c_str());
  auto result = method(javaPart_.get(), viewTag, propNameJStr);
  std::string str = result->toStdString();
  return jsi::Value(rt, jsi::String::createFromAscii(rt, str));
}

void NativeProxy::configureProps(
    jsi::Runtime &rt,
    const jsi::Value &uiProps,
    const jsi::Value &nativeProps) {
  static const auto method = getJniMethod<void(
      ReadableNativeArray::javaobject, ReadableNativeArray::javaobject)>(
      "configureProps");
  method(
      javaPart_.get(),
      ReadableNativeArray::newObjectCxxArgs(jsi::dynamicFromValue(rt, uiProps))
          .get(),
      ReadableNativeArray::newObjectCxxArgs(
          jsi::dynamicFromValue(rt, nativeProps))
          .get());
}

void NativeProxy::updateProps(jsi::Runtime &rt, const jsi::Value &operations) {
  static const auto method =
      getJniMethod<void(int, JMap<JString, JObject>::javaobject)>(
          "updateProps");
  auto array = operations.asObject(rt).asArray(rt);
  size_t length = array.size(rt);
  for (size_t i = 0; i < length; ++i) {
    auto item = array.getValueAtIndex(rt, i).asObject(rt);
    int viewTag = item.getProperty(rt, "tag").asNumber();
    const jsi::Object &props = item.getProperty(rt, "updates").asObject(rt);
    method(
        javaPart_.get(),
        viewTag,
        JNIHelper::ConvertToPropsMap(rt, props).get());
  }
}

void NativeProxy::scrollTo(int viewTag, double x, double y, bool animated) {
  static const auto method =
      getJniMethod<void(int, double, double, bool)>("scrollTo");
  method(javaPart_.get(), viewTag, x, y, animated);
}

inline jni::local_ref<ReadableArray::javaobject> castReadableArray(
    jni::local_ref<ReadableNativeArray::javaobject> const &nativeArray) {
  return make_local(
      reinterpret_cast<ReadableArray::javaobject>(nativeArray.get()));
}

void NativeProxy::dispatchCommand(
    jsi::Runtime &rt,
    const int viewTag,
    const jsi::Value &commandNameValue,
    const jsi::Value &argsValue) {
  static const auto method = getJniMethod<void(
      int, jni::local_ref<JString>, jni::local_ref<ReadableArray::javaobject>)>(
      "dispatchCommand");
  local_ref<JString> commandId =
      jni::make_jstring(commandNameValue.asString(rt).utf8(rt).c_str());
  jni::local_ref<ReadableArray::javaobject> commandArgs =
      castReadableArray(ReadableNativeArray::newObjectCxxArgs(
          jsi::dynamicFromValue(rt, argsValue)));
  method(javaPart_.get(), viewTag, commandId, commandArgs);
}

std::vector<std::pair<std::string, double>> NativeProxy::measure(int viewTag) {
  static const auto method =
      getJniMethod<local_ref<JArrayFloat>(int)>("measure");
  local_ref<JArrayFloat> output = method(javaPart_.get(), viewTag);
  size_t size = output->size();
  auto elements = output->getRegion(0, size);

  return {
      {"x", elements[0]},
      {"y", elements[1]},
      {"pageX", elements[2]},
      {"pageY", elements[3]},
      {"width", elements[4]},
      {"height", elements[5]},
  };
}
#endif // RCT_NEW_ARCH_ENABLED

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

  jsi::Runtime &rt = reanimatedModuleProxy_->getUIRuntime();
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

void NativeProxy::progressLayoutAnimation(
    jsi::Runtime &rt,
    int tag,
    const jsi::Object &newProps,
    bool isSharedTransition) {
  auto newPropsJNI = JNIHelper::ConvertToPropsMap(rt, newProps);
  layoutAnimations_->cthis()->progressLayoutAnimation(
      tag, newPropsJNI, isSharedTransition);
}

PlatformDepMethodsHolder NativeProxy::getPlatformDependentMethods() {
#ifdef RCT_NEW_ARCH_ENABLED
  // nothing
#else
  auto updatePropsFunction = bindThis(&NativeProxy::updateProps);

  auto measureFunction = bindThis(&NativeProxy::measure);

  auto scrollToFunction = bindThis(&NativeProxy::scrollTo);

  auto dispatchCommandFunction = bindThis(&NativeProxy::dispatchCommand);

  auto obtainPropFunction = bindThis(&NativeProxy::obtainProp);
#endif

  auto getAnimationTimestamp = bindThis(&NativeProxy::getAnimationTimestamp);

  auto requestRender = bindThis(&NativeProxy::requestRender);

#ifdef RCT_NEW_ARCH_ENABLED
  // nothing
#else
  auto configurePropsFunction = bindThis(&NativeProxy::configureProps);
#endif

  auto registerSensorFunction = bindThis(&NativeProxy::registerSensor);
  auto unregisterSensorFunction = bindThis(&NativeProxy::unregisterSensor);

  auto setGestureStateFunction = bindThis(&NativeProxy::setGestureState);

  auto subscribeForKeyboardEventsFunction =
      bindThis(&NativeProxy::subscribeForKeyboardEvents);

  auto unsubscribeFromKeyboardEventsFunction =
      bindThis(&NativeProxy::unsubscribeFromKeyboardEvents);

  auto progressLayoutAnimation =
      bindThis(&NativeProxy::progressLayoutAnimation);

  auto endLayoutAnimation = [weakThis = weak_from_this()](
                                int tag, bool removeView) {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }
    strongThis->layoutAnimations_->cthis()->endLayoutAnimation(tag, removeView);
  };

  auto maybeFlushUiUpdatesQueueFunction =
      bindThis(&NativeProxy::maybeFlushUIUpdatesQueue);

  return {
      requestRender,
#ifdef RCT_NEW_ARCH_ENABLED
  // nothing
#else
      updatePropsFunction,
      scrollToFunction,
      dispatchCommandFunction,
      measureFunction,
      configurePropsFunction,
      obtainPropFunction,
#endif
      getAnimationTimestamp,
      progressLayoutAnimation,
      endLayoutAnimation,
      registerSensorFunction,
      unregisterSensorFunction,
      setGestureStateFunction,
      subscribeForKeyboardEventsFunction,
      unsubscribeFromKeyboardEventsFunction,
      maybeFlushUiUpdatesQueueFunction,
  };
}

void NativeProxy::setupLayoutAnimations() {
  auto weakReanimatedModuleProxy =
      std::weak_ptr<ReanimatedModuleProxy>(reanimatedModuleProxy_);

  layoutAnimations_->cthis()->setAnimationStartingBlock(
      [weakReanimatedModuleProxy](
          int tag, int type, alias_ref<JMap<jstring, jstring>> values) {
        if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
          jsi::Runtime &rt = reanimatedModuleProxy->getUIRuntime();
          jsi::Object yogaValues(rt);
          for (const auto &entry : *values) {
            try {
              std::string keyString = entry.first->toStdString();
              std::string valueString = entry.second->toStdString();
              auto key = jsi::String::createFromAscii(rt, keyString);
              if (keyString == "currentTransformMatrix" ||
                  keyString == "targetTransformMatrix") {
                jsi::Array matrix =
                    jsi_utils::convertStringToArray(rt, valueString, 9);
                yogaValues.setProperty(rt, key, matrix);
              } else {
                auto value = stod(valueString);
                yogaValues.setProperty(rt, key, value);
              }
            } catch (std::invalid_argument e) {
              throw std::runtime_error(
                  "[Reanimated] Failed to convert value to number.");
            }
          }
          reanimatedModuleProxy->layoutAnimationsManager().startLayoutAnimation(
              rt, tag, static_cast<LayoutAnimationType>(type), yogaValues);
        }
      });

  layoutAnimations_->cthis()->setHasAnimationBlock(
      [weakReanimatedModuleProxy](int tag, int type) {
        if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
          return reanimatedModuleProxy->layoutAnimationsManager()
              .hasLayoutAnimation(tag, static_cast<LayoutAnimationType>(type));
        }
        return false;
      });

  layoutAnimations_->cthis()->setShouldAnimateExitingBlock(
      [weakReanimatedModuleProxy](int tag, bool shouldAnimate) {
        if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
          return reanimatedModuleProxy->layoutAnimationsManager()
              .shouldAnimateExiting(tag, shouldAnimate);
        }
        return false;
      });

#ifndef NDEBUG
  layoutAnimations_->cthis()->setCheckDuplicateSharedTag(
      [weakReanimatedModuleProxy](int viewTag, int screenTag) {
        if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
          reanimatedModuleProxy->layoutAnimationsManager()
              .checkDuplicateSharedTag(viewTag, screenTag);
        }
      });
#endif

  layoutAnimations_->cthis()->setClearAnimationConfigBlock(
      [weakReanimatedModuleProxy](int tag) {
        if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
          reanimatedModuleProxy->layoutAnimationsManager()
              .clearLayoutAnimationConfig(tag);
        }
      });

  layoutAnimations_->cthis()->setCancelAnimationForTag(
      [weakReanimatedModuleProxy](int tag) {
        if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
          jsi::Runtime &rt = reanimatedModuleProxy->getUIRuntime();
          reanimatedModuleProxy->layoutAnimationsManager()
              .cancelLayoutAnimation(rt, tag);
        }
      });

  layoutAnimations_->cthis()->setFindPrecedingViewTagForTransition(
      [weakReanimatedModuleProxy](int tag) {
        if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
          return reanimatedModuleProxy->layoutAnimationsManager()
              .findPrecedingViewTagForTransition(tag);
        } else {
          return -1;
        }
      });

  layoutAnimations_->cthis()->setGetSharedGroupBlock(
      [weakReanimatedModuleProxy](int tag) -> std::vector<int> {
        if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
          return reanimatedModuleProxy->layoutAnimationsManager()
              .getSharedGroup(tag);
        } else {
          return {};
        }
      });
}

void NativeProxy::invalidateCpp() {
  layoutAnimations_->cthis()->invalidate();
  // cleanup all animated sensors here, since the next line resets
  // the pointer and it will be too late after it
  reanimatedModuleProxy_->cleanupSensors();
  reanimatedModuleProxy_.reset();
  javaPart_ = nullptr;
}

} // namespace reanimated
