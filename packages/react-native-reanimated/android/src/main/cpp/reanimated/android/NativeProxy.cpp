#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/RuntimeDecorators/RNRuntimeDecorator.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>
#include <reanimated/android/AndroidUIScheduler.h>
#include <reanimated/android/NativeProxy.h>

#include <worklets/Tools/ReanimatedJSIUtils.h>
#include <worklets/Tools/ReanimatedVersion.h>
#include <worklets/WorkletRuntime/ReanimatedRuntime.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>
#include <worklets/WorkletRuntime/WorkletRuntimeCollector.h>

#include <android/log.h>
#include <fbjni/fbjni.h>
#include <jsi/JSIDynamic.h>
#include <jsi/jsi.h>
#include <react/jni/JMessageQueueThread.h>
#include <react/jni/ReadableNativeArray.h>
#include <react/jni/ReadableNativeMap.h>

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/fabric/Binding.h>
#endif

namespace reanimated {

NativeProxy::NativeProxy(
    facebook::jni::alias_ref<NativeProxy::javaobject> jThis,
    facebook::jsi::Runtime *rnRuntime,
    const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
    const std::shared_ptr<worklets::UIScheduler> &uiScheduler,
    facebook::jni::global_ref<LayoutAnimations::javaobject> layoutAnimations,
    facebook::jni::alias_ref<
        facebook::react::JavaMessageQueueThread::javaobject> messageQueueThread,
#ifdef RCT_NEW_ARCH_ENABLED
    facebook::jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        fabricUIManager,
#endif
    const std::string &valueUnpackerCode)
    : javaPart_(facebook::jni::make_global(jThis)),
      rnRuntime_(rnRuntime),
      nativeReanimatedModule_(std::make_shared<NativeReanimatedModule>(
          *rnRuntime,
          std::make_shared<worklets::JSScheduler>(*rnRuntime, jsCallInvoker),
          std::make_shared<facebook::react::JMessageQueueThread>(
              messageQueueThread),
          uiScheduler,
          getPlatformDependentMethods(),
          valueUnpackerCode,
          /* isBridgeless */ false,
          getIsReducedMotion())),
      layoutAnimations_(std::move(layoutAnimations)) {
#ifdef RCT_NEW_ARCH_ENABLED
  commonInit(fabricUIManager);
#endif // RCT_NEW_ARCH_ENABLED
}

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
NativeProxy::NativeProxy(
    facebook::jni::alias_ref<NativeProxy::javaobject> jThis,
    facebook::jsi::Runtime *rnRuntime,
    facebook::react::RuntimeExecutor runtimeExecutor,
    const std::shared_ptr<worklets::UIScheduler> &uiScheduler,
    facebook::jni::global_ref<LayoutAnimations::javaobject> layoutAnimations,
    facebook::jni::alias_ref<
        facebook::react::JavaMessageQueueThread::javaobject> messageQueueThread,
    facebook::jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        fabricUIManager,
    const std::string &valueUnpackerCode)
    : javaPart_(facebook::jni::make_global(jThis)),
      rnRuntime_(rnRuntime),
      nativeReanimatedModule_(std::make_shared<NativeReanimatedModule>(
          *rnRuntime,
          std::make_shared<worklets::JSScheduler>(*rnRuntime, runtimeExecutor),
          std::make_shared<facebook::react::JMessageQueueThread>(
              messageQueueThread),
          uiScheduler,
          getPlatformDependentMethods(),
          valueUnpackerCode,
          /* isBridgeless */ true,
          getIsReducedMotion())),
      layoutAnimations_(std::move(layoutAnimations)) {
  commonInit(fabricUIManager);
}
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED

#ifdef RCT_NEW_ARCH_ENABLED
void NativeProxy::commonInit(
    facebook::jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        &fabricUIManager) {
  const auto &uiManager =
      fabricUIManager->getBinding()->getScheduler()->getUIManager();
  nativeReanimatedModule_->initializeFabric(uiManager);
  // removed temporarily, event listener mechanism needs to be fixed on RN side
  // eventListener_ = std::make_shared<EventListener>(
  //     [nativeReanimatedModule,
  //      getAnimationTimestamp](const RawEvent &rawEvent) {
  //       return nativeReanimatedModule->handleRawEvent(
  //           rawEvent, getAnimationTimestamp());
  //     });
  // reactScheduler_ = binding->getScheduler();
  // reactScheduler_->addEventListener(eventListener_);
}
#endif // RCT_NEW_ARCH_ENABLED

NativeProxy::~NativeProxy() {
  // removed temporary, new event listener mechanism need fix on the RN side
  // reactScheduler_->removeEventListener(eventListener_);

  // cleanup all animated sensors here, since NativeProxy
  // has already been destroyed when AnimatedSensorModule's
  // destructor is ran
  nativeReanimatedModule_->cleanupSensors();
}

facebook::jni::local_ref<NativeProxy::jhybriddata> NativeProxy::initHybrid(
    facebook::jni::alias_ref<jhybridobject> jThis,
    jlong jsContext,
    facebook::jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
        jsCallInvokerHolder,
    facebook::jni::alias_ref<AndroidUIScheduler::javaobject> androidUiScheduler,
    facebook::jni::alias_ref<LayoutAnimations::javaobject> layoutAnimations,
    facebook::jni::alias_ref<
        facebook::react::JavaMessageQueueThread::javaobject> messageQueueThread,
#ifdef RCT_NEW_ARCH_ENABLED
    facebook::jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        fabricUIManager,
#endif
    const std::string &valueUnpackerCode) {
  auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
  auto uiScheduler = androidUiScheduler->cthis()->getUIScheduler();
  return makeCxxInstance(
      jThis,
      (facebook::jsi::Runtime *)jsContext,
      jsCallInvoker,
      uiScheduler,
      make_global(layoutAnimations),
      messageQueueThread,
#ifdef RCT_NEW_ARCH_ENABLED
      fabricUIManager,
#endif
      valueUnpackerCode);
}

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
facebook::jni::local_ref<NativeProxy::jhybriddata>
NativeProxy::initHybridBridgeless(
    facebook::jni::alias_ref<jhybridobject> jThis,
    jlong jsContext,
    facebook::jni::alias_ref<facebook::react::JRuntimeExecutor::javaobject>
        runtimeExecutorHolder,
    facebook::jni::alias_ref<AndroidUIScheduler::javaobject> androidUiScheduler,
    facebook::jni::alias_ref<LayoutAnimations::javaobject> layoutAnimations,
    facebook::jni::alias_ref<
        facebook::react::JavaMessageQueueThread::javaobject> messageQueueThread,
    facebook::jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        fabricUIManager,
    const std::string &valueUnpackerCode) {
  auto uiScheduler = androidUiScheduler->cthis()->getUIScheduler();
  auto runtimeExecutor = runtimeExecutorHolder->cthis()->get();
  return makeCxxInstance(
      jThis,
      (facebook::jsi::Runtime *)jsContext,
      runtimeExecutor,
      uiScheduler,
      make_global(layoutAnimations),
      messageQueueThread,
      fabricUIManager,
      valueUnpackerCode);
}
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED

#ifndef NDEBUG
void NativeProxy::checkJavaVersion(facebook::jsi::Runtime &rnRuntime) {
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

  auto cppVersion = worklets::getReanimatedCppVersion();
  if (cppVersion != javaVersion) {
    throw std::runtime_error(
        std::string(
            "[Reanimated] Mismatch between C++ code version and Java code version (") +
        cppVersion + " vs. " + javaVersion + " respectively).\n" +
        "See `https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#mismatch-between-c-code-version-and-java-code-version` for more details.");
  }
}

void NativeProxy::injectCppVersion() {
  auto cppVersion = worklets::getReanimatedCppVersion();
  try {
    static const auto method =
        getJniMethod<void(facebook::jni::local_ref<facebook::jni::JString>)>(
            "setCppVersion");
    method(javaPart_.get(), facebook::jni::make_jstring(cppVersion));
  } catch (std::exception &) {
    throw std::runtime_error(
        std::string(
            "[Reanimated] C++ side failed to resolve Java code version (injection).\n") +
        "See `https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#c-side-failed-to-resolve-java-code-version` for more details.");
  }
}
#endif // NDEBUG

void NativeProxy::installJSIBindings() {
  facebook::jsi::Runtime &rnRuntime = *rnRuntime_;
  worklets::WorkletRuntimeCollector::install(rnRuntime);
  RNRuntimeDecorator::decorate(rnRuntime, nativeReanimatedModule_);
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
  return nativeReanimatedModule_->isAnyHandlerWaitingForEvent(
      eventName, emitterReactTag);
}

void NativeProxy::performOperations() {
#ifdef RCT_NEW_ARCH_ENABLED
  nativeReanimatedModule_->performOperations();
#endif
}

bool NativeProxy::getIsReducedMotion() {
  static const auto method = getJniMethod<jboolean()>("getIsReducedMotion");
  return method(javaPart_.get());
}

void NativeProxy::registerNatives() {
  registerHybrid({
    makeNativeMethod("initHybrid", NativeProxy::initHybrid),
#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
        makeNativeMethod(
            "initHybridBridgeless", NativeProxy::initHybridBridgeless),
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
        makeNativeMethod("installJSIBindings", NativeProxy::installJSIBindings),
        makeNativeMethod(
            "isAnyHandlerWaitingForEvent",
            NativeProxy::isAnyHandlerWaitingForEvent),
        makeNativeMethod("performOperations", NativeProxy::performOperations)
  });
}

void NativeProxy::requestRender(
    std::function<void(double)> onRender,
    facebook::jsi::Runtime &) {
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
  static const auto method = getJniMethod<void()>("maybeFlushUIUpdatesQueue");
  method(javaPart_.get());
}

#ifdef RCT_NEW_ARCH_ENABLED
// nothing
#else
facebook::jsi::Value NativeProxy::obtainProp(
    facebook::jsi::Runtime &rt,
    const int viewTag,
    const facebook::jsi::Value &propName) {
  static const auto method =
      getJniMethod<facebook::jni::local_ref<facebook::jni::JString>(
          int, facebook::jni::local_ref<facebook::jni::JString>)>("obtainProp");
  facebook::jni::local_ref<facebook::jni::JString> propNameJStr =
      facebook::jni::make_jstring(propName.asString(rt).utf8(rt).c_str());
  auto result = method(javaPart_.get(), viewTag, propNameJStr);
  std::string str = result->toStdString();
  return facebook::jsi::Value(
      rt, facebook::jsi::String::createFromAscii(rt, str));
}

void NativeProxy::configureProps(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &uiProps,
    const facebook::jsi::Value &nativeProps) {
  static const auto method = getJniMethod<void(
      facebook::react::ReadableNativeArray::javaobject,
      facebook::react::ReadableNativeArray::javaobject)>("configureProps");
  method(
      javaPart_.get(),
      facebook::react::ReadableNativeArray::newObjectCxxArgs(
          facebook::jsi::dynamicFromValue(rt, uiProps))
          .get(),
      facebook::react::ReadableNativeArray::newObjectCxxArgs(
          facebook::jsi::dynamicFromValue(rt, nativeProps))
          .get());
}

void NativeProxy::updateProps(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &operations) {
  static const auto method = getJniMethod<void(
      int,
      facebook::jni::JMap<facebook::jni::JString, facebook::jni::JObject>::
          javaobject)>("updateProps");
  auto array = operations.asObject(rt).asArray(rt);
  size_t length = array.size(rt);
  for (size_t i = 0; i < length; ++i) {
    auto item = array.getValueAtIndex(rt, i).asObject(rt);
    int viewTag = item.getProperty(rt, "tag").asNumber();
    const facebook::jsi::Object &props =
        item.getProperty(rt, "updates").asObject(rt);
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

inline facebook::jni::local_ref<facebook::react::ReadableArray::javaobject>
castReadableArray(
    facebook::jni::local_ref<
        facebook::react::ReadableNativeArray::javaobject> const &nativeArray) {
  return facebook::jni::make_local(
      reinterpret_cast<facebook::react::ReadableArray::javaobject>(
          nativeArray.get()));
}

void NativeProxy::dispatchCommand(
    facebook::jsi::Runtime &rt,
    const int viewTag,
    const facebook::jsi::Value &commandNameValue,
    const facebook::jsi::Value &argsValue) {
  static const auto method = getJniMethod<void(
      int,
      facebook::jni::local_ref<facebook::jni::JString>,
      facebook::jni::local_ref<facebook::react::ReadableArray::javaobject>)>(
      "dispatchCommand");
  facebook::jni::local_ref<facebook::jni::JString> commandId =
      facebook::jni::make_jstring(
          commandNameValue.asString(rt).utf8(rt).c_str());
  facebook::jni::local_ref<facebook::react::ReadableArray::javaobject>
      commandArgs = castReadableArray(
          facebook::react::ReadableNativeArray::newObjectCxxArgs(
              facebook::jsi::dynamicFromValue(rt, argsValue)));
  method(javaPart_.get(), viewTag, commandId, commandArgs);
}

std::vector<std::pair<std::string, double>> NativeProxy::measure(int viewTag) {
  static const auto method =
      getJniMethod<facebook::jni::local_ref<facebook::jni::JArrayFloat>(int)>(
          "measure");
  facebook::jni::local_ref<facebook::jni::JArrayFloat> output =
      method(javaPart_.get(), viewTag);
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

#ifdef RCT_NEW_ARCH_ENABLED
inline facebook::jni::local_ref<facebook::react::ReadableMap::javaobject>
castReadableMap(
    facebook::jni::local_ref<
        facebook::react::ReadableNativeMap::javaobject> const &nativeMap) {
  return facebook::jni::make_local(
      reinterpret_cast<facebook::react::ReadableMap::javaobject>(
          nativeMap.get()));
}

void NativeProxy::synchronouslyUpdateUIProps(
    facebook::jsi::Runtime &rt,
    facebook::react::Tag tag,
    const facebook::jsi::Object &props) {
  static const auto method = getJniMethod<void(
      int, facebook::jni::local_ref<facebook::react::ReadableMap::javaobject>)>(
      "synchronouslyUpdateUIProps");
  facebook::jni::local_ref<facebook::react::ReadableMap::javaobject> uiProps =
      castReadableMap(facebook::react::ReadableNativeMap::newObjectCxxArgs(
          facebook::jsi::dynamicFromValue(
              rt, facebook::jsi::Value(rt, props))));
  method(javaPart_.get(), tag, uiProps);
}
#endif

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
    facebook::jni::alias_ref<facebook::jni::JString> eventName,
    jint emitterReactTag,
    facebook::jni::alias_ref<facebook::react::WritableMap> event) {
  // handles RCTEvents from RNGestureHandler
  if (event.get() == nullptr) {
    // Ignore events with null payload.
    return;
  }
  // TODO: convert event directly to facebook::jsi::Value without JSON
  // serialization
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
#if REACT_NATIVE_MINOR_VERSION >= 72
  std::string eventJSON = eventAsString;
#else
  // remove "{ NativeMap: " and " }"
  std::string eventJSON = eventAsString.substr(13, eventAsString.length() - 15);
#endif
  if (eventJSON == "null") {
    return;
  }

  facebook::jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
  facebook::jsi::Value payload;
  try {
    payload = facebook::jsi::Value::createFromJsonUtf8(
        rt, reinterpret_cast<uint8_t *>(&eventJSON[0]), eventJSON.size());
  } catch (std::exception &) {
    // Ignore events with malformed JSON payload.
    return;
  }

  nativeReanimatedModule_->handleEvent(
      eventName->toString(), emitterReactTag, payload, getAnimationTimestamp());
}

void NativeProxy::progressLayoutAnimation(
    facebook::jsi::Runtime &rt,
    int tag,
    const facebook::jsi::Object &newProps,
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
  auto synchronouslyUpdateUIPropsFunction =
      bindThis(&NativeProxy::synchronouslyUpdateUIProps);
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

  auto endLayoutAnimation = [this](int tag, bool removeView) {
    this->layoutAnimations_->cthis()->endLayoutAnimation(tag, removeView);
  };

  auto maybeFlushUiUpdatesQueueFunction =
      bindThis(&NativeProxy::maybeFlushUIUpdatesQueue);

  return {
      requestRender,
#ifdef RCT_NEW_ARCH_ENABLED
      synchronouslyUpdateUIPropsFunction,
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
  auto weakNativeReanimatedModule =
      std::weak_ptr<NativeReanimatedModule>(nativeReanimatedModule_);

  layoutAnimations_->cthis()->setAnimationStartingBlock(
      [weakNativeReanimatedModule](
          int tag,
          int type,
          facebook::jni::alias_ref<facebook::jni::JMap<jstring, jstring>>
              values) {
        if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
          facebook::jsi::Runtime &rt = nativeReanimatedModule->getUIRuntime();
          facebook::jsi::Object yogaValues(rt);
          for (const auto &entry : *values) {
            try {
              std::string keyString = entry.first->toStdString();
              std::string valueString = entry.second->toStdString();
              auto key = facebook::jsi::String::createFromAscii(rt, keyString);
              if (keyString == "currentTransformMatrix" ||
                  keyString == "targetTransformMatrix") {
                facebook::jsi::Array matrix =
                    worklets::jsi_utils::convertStringToArray(
                        rt, valueString, 9);
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
          nativeReanimatedModule->layoutAnimationsManager()
              .startLayoutAnimation(
                  rt, tag, static_cast<LayoutAnimationType>(type), yogaValues);
        }
      });

  layoutAnimations_->cthis()->setHasAnimationBlock(
      [weakNativeReanimatedModule](int tag, int type) {
        if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
          return nativeReanimatedModule->layoutAnimationsManager()
              .hasLayoutAnimation(tag, static_cast<LayoutAnimationType>(type));
        }
        return false;
      });

  layoutAnimations_->cthis()->setShouldAnimateExitingBlock(
      [weakNativeReanimatedModule](int tag, bool shouldAnimate) {
        if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
          return nativeReanimatedModule->layoutAnimationsManager()
              .shouldAnimateExiting(tag, shouldAnimate);
        }
        return false;
      });

#ifndef NDEBUG
  layoutAnimations_->cthis()->setCheckDuplicateSharedTag(
      [weakNativeReanimatedModule](int viewTag, int screenTag) {
        if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
          nativeReanimatedModule->layoutAnimationsManager()
              .checkDuplicateSharedTag(viewTag, screenTag);
        }
      });
#endif

  layoutAnimations_->cthis()->setClearAnimationConfigBlock(
      [weakNativeReanimatedModule](int tag) {
        if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
          nativeReanimatedModule->layoutAnimationsManager()
              .clearLayoutAnimationConfig(tag);
        }
      });

  layoutAnimations_->cthis()->setCancelAnimationForTag(
      [weakNativeReanimatedModule](int tag) {
        if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
          facebook::jsi::Runtime &rt = nativeReanimatedModule->getUIRuntime();
          nativeReanimatedModule->layoutAnimationsManager()
              .cancelLayoutAnimation(rt, tag);
        }
      });

  layoutAnimations_->cthis()->setFindPrecedingViewTagForTransition(
      [weakNativeReanimatedModule](int tag) {
        if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
          return nativeReanimatedModule->layoutAnimationsManager()
              .findPrecedingViewTagForTransition(tag);
        } else {
          return -1;
        }
      });

  layoutAnimations_->cthis()->setGetSharedGroupBlock(
      [weakNativeReanimatedModule](int tag) -> std::vector<int> {
        if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
          return nativeReanimatedModule->layoutAnimationsManager()
              .getSharedGroup(tag);
        } else {
          return {};
        }
      });
}

} // namespace reanimated
