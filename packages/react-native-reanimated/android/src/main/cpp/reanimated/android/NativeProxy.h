#pragma once

#include <reanimated/NativeModules/NativeReanimatedModule.h>
#include <reanimated/android/AndroidUIScheduler.h>
#include <reanimated/android/JNIHelper.h>
#include <reanimated/android/LayoutAnimations.h>

#include <worklets/Tools/UIScheduler.h>

#include <ReactCommon/CallInvokerHolder.h>
#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <react/jni/CxxModuleWrapper.h>
#include <react/jni/JMessageQueueThread.h>
#include <react/jni/JavaScriptExecutorHolder.h>
#include <react/jni/WritableNativeMap.h>

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/fabric/JFabricUIManager.h>
#include <react/renderer/scheduler/Scheduler.h>
#if REACT_NATIVE_MINOR_VERSION >= 74
#include <react/jni/JRuntimeExecutor.h>
#endif // REACT_NATIVE_MINOR_VERSION >= 74
#endif // RCT_NEW_ARCH_ENABLED

#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace reanimated {

class AnimationFrameCallback
    : public facebook::jni::HybridClass<AnimationFrameCallback> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/nativeProxy/AnimationFrameCallback;";

  void onAnimationFrame(double timestampMs) {
    callback_(timestampMs);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod(
            "onAnimationFrame", AnimationFrameCallback::onAnimationFrame),
    });
  }

 private:
  friend HybridBase;

  explicit AnimationFrameCallback(std::function<void(double)> callback)
      : callback_(std::move(callback)) {}

  std::function<void(double)> callback_;
};

class EventHandler : public facebook::jni::HybridClass<EventHandler> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/nativeProxy/EventHandler;";

  void receiveEvent(
      facebook::jni::alias_ref<facebook::jni::JString> eventKey,
      jint emitterReactTag,
      facebook::jni::alias_ref<facebook::react::WritableMap> event) {
    handler_(eventKey, emitterReactTag, event);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod("receiveEvent", EventHandler::receiveEvent),
    });
  }

 private:
  friend HybridBase;

  explicit EventHandler(
      std::function<void(
          facebook::jni::alias_ref<facebook::jni::JString>,
          jint emitterReactTag,
          facebook::jni::alias_ref<facebook::react::WritableMap>)> handler)
      : handler_(std::move(handler)) {}

  std::function<void(
      facebook::jni::alias_ref<facebook::jni::JString>,
      jint,
      facebook::jni::alias_ref<facebook::react::WritableMap>)>
      handler_;
};

class SensorSetter : public facebook::jni::HybridClass<SensorSetter> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/nativeProxy/SensorSetter;";

  void sensorSetter(
      facebook::jni::alias_ref<facebook::jni::JArrayFloat> value,
      int orientationDegrees) {
    size_t size = value->size();
    auto elements = value->getRegion(0, size);
    double array[7];
    for (size_t i = 0; i < size; i++) {
      array[i] = elements[i];
    }
    callback_(array, orientationDegrees);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod("sensorSetter", SensorSetter::sensorSetter),
    });
  }

 private:
  friend HybridBase;

  explicit SensorSetter(std::function<void(double[], int)> callback)
      : callback_(std::move(callback)) {}

  std::function<void(double[], int)> callback_;
};

class KeyboardWorkletWrapper
    : public facebook::jni::HybridClass<KeyboardWorkletWrapper> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/keyboard/KeyboardWorkletWrapper;";

  void invoke(int keyboardState, int height) {
    callback_(keyboardState, height);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod("invoke", KeyboardWorkletWrapper::invoke),
    });
  }

 private:
  friend HybridBase;

  explicit KeyboardWorkletWrapper(std::function<void(int, int)> callback)
      : callback_(std::move(callback)) {}

  std::function<void(int, int)> callback_;
};

class NativeProxy : public facebook::jni::HybridClass<NativeProxy> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/NativeProxy;";
  static facebook::jni::local_ref<jhybriddata> initHybrid(
      facebook::jni::alias_ref<jhybridobject> jThis,
      jlong jsContext,
      facebook::jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
          jsCallInvokerHolder,
      facebook::jni::alias_ref<AndroidUIScheduler::javaobject>
          androidUiScheduler,
      facebook::jni::alias_ref<LayoutAnimations::javaobject> layoutAnimations,
      facebook::jni::alias_ref<
          facebook::react::JavaMessageQueueThread::javaobject>
          messageQueueThread,
#ifdef RCT_NEW_ARCH_ENABLED
      facebook::jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
          fabricUIManager,
#endif
      const std::string &valueUnpackerCode);

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
  static facebook::jni::local_ref<jhybriddata> initHybridBridgeless(
      facebook::jni::alias_ref<jhybridobject> jThis,
      jlong jsContext,
      facebook::jni::alias_ref<facebook::react::JRuntimeExecutor::javaobject>
          runtimeExecutorHolder,
      facebook::jni::alias_ref<AndroidUIScheduler::javaobject>
          androidUiScheduler,
      facebook::jni::alias_ref<LayoutAnimations::javaobject> layoutAnimations,
      facebook::jni::alias_ref<
          facebook::react::JavaMessageQueueThread::javaobject>
          messageQueueThread,
      facebook::jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
          fabricUIManager,
      const std::string &valueUnpackerCode);
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED
  static void registerNatives();

  ~NativeProxy();

 private:
  friend HybridBase;
  facebook::jni::global_ref<NativeProxy::javaobject> javaPart_;
  facebook::jsi::Runtime *rnRuntime_;
  std::shared_ptr<NativeReanimatedModule> nativeReanimatedModule_;
  facebook::jni::global_ref<LayoutAnimations::javaobject> layoutAnimations_;
#ifndef NDEBUG
  void checkJavaVersion(facebook::jsi::Runtime &);
  void injectCppVersion();
#endif // NDEBUG
#ifdef RCT_NEW_ARCH_ENABLED
  // removed temporarily, event listener mechanism needs to be fixed on RN side
  // std::shared_ptr<facebook::react::Scheduler> reactScheduler_;
  // std::shared_ptr<EventListener> eventListener_;
#endif // RCT_NEW_ARCH_ENABLED
  void installJSIBindings();
#ifdef RCT_NEW_ARCH_ENABLED
  void synchronouslyUpdateUIProps(
      facebook::jsi::Runtime &rt,
      facebook::react::Tag viewTag,
      const facebook::jsi::Object &props);
#endif
  PlatformDepMethodsHolder getPlatformDependentMethods();
  void setupLayoutAnimations();

  double getAnimationTimestamp();
  bool isAnyHandlerWaitingForEvent(
      const std::string &eventName,
      const int emitterReactTag);
  void performOperations();
  bool getIsReducedMotion();
  void requestRender(
      std::function<void(double)> onRender,
      facebook::jsi::Runtime &rt);
  void registerEventHandler();
  void maybeFlushUIUpdatesQueue();
  void setGestureState(int handlerTag, int newState);
  int registerSensor(
      int sensorType,
      int interval,
      int iosReferenceFrame,
      std::function<void(double[], int)> setter);
  void unregisterSensor(int sensorId);
  int subscribeForKeyboardEvents(
      std::function<void(int, int)> callback,
      bool isStatusBarTranslucent,
      bool isNavigationBarTranslucent);
  void unsubscribeFromKeyboardEvents(int listenerId);
#ifdef RCT_NEW_ARCH_ENABLED
  // nothing
#else
  facebook::jsi::Value obtainProp(
      facebook::jsi::Runtime &rt,
      const int viewTag,
      const facebook::jsi::Value &propName);
  void configureProps(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &uiProps,
      const facebook::jsi::Value &nativeProps);
  void updateProps(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &operations);
  void scrollTo(int viewTag, double x, double y, bool animated);
  void dispatchCommand(
      facebook::jsi::Runtime &rt,
      const int viewTag,
      const facebook::jsi::Value &commandNameValue,
      const facebook::jsi::Value &argsValue);
  std::vector<std::pair<std::string, double>> measure(int viewTag);
#endif
  void handleEvent(
      facebook::jni::alias_ref<facebook::jni::JString> eventName,
      jint emitterReactTag,
      facebook::jni::alias_ref<facebook::react::WritableMap> event);

  void progressLayoutAnimation(
      facebook::jsi::Runtime &rt,
      int tag,
      const facebook::jsi::Object &newProps,
      bool isSharedTransition);

  /***
   * Wraps a method of `NativeProxy` in a function object capturing `this`
   * @tparam TReturn return type of passed method
   * @tparam TParams paramater types of passed method
   * @param methodPtr pointer to method to be wrapped
   * @return a function object with the same signature as the method, calling
   * that method on `this`
   */
  template <class TReturn, class... TParams>
  std::function<TReturn(TParams...)> bindThis(
      TReturn (NativeProxy::*methodPtr)(TParams...)) {
    return [this, methodPtr](TParams &&...args) {
      return (this->*methodPtr)(std::forward<TParams>(args)...);
    };
  }

  template <class Signature>
  facebook::jni::JMethod<Signature> getJniMethod(
      std::string const &methodName) {
    return javaPart_->getClass()->getMethod<Signature>(methodName.c_str());
  }

  explicit NativeProxy(
      facebook::jni::alias_ref<NativeProxy::jhybridobject> jThis,
      facebook::jsi::Runtime *rnRuntime,
      const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
      const std::shared_ptr<worklets::UIScheduler> &uiScheduler,
      facebook::jni::global_ref<LayoutAnimations::javaobject> layoutAnimations,
      facebook::jni::alias_ref<
          facebook::react::JavaMessageQueueThread::javaobject>
          messageQueueThread,
#ifdef RCT_NEW_ARCH_ENABLED
      facebook::jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
          fabricUIManager,
#endif
      const std::string &valueUnpackerCode);

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
  explicit NativeProxy(
      facebook::jni::alias_ref<NativeProxy::jhybridobject> jThis,
      facebook::jsi::Runtime *rnRuntime,
      facebook::react::RuntimeExecutor runtimeExecutor,
      const std::shared_ptr<worklets::UIScheduler> &uiScheduler,
      facebook::jni::global_ref<LayoutAnimations::javaobject> layoutAnimations,
      facebook::jni::alias_ref<
          facebook::react::JavaMessageQueueThread::javaobject>
          messageQueueThread,
      facebook::jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
          fabricUIManager,
      const std::string &valueUnpackerCode);
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED

#ifdef RCT_NEW_ARCH_ENABLED
  void commonInit(
      facebook::jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
          &fabricUIManager);
#endif // RCT_NEW_ARCH_ENABLED
};

} // namespace reanimated
