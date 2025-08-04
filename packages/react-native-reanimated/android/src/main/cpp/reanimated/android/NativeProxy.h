#pragma once

#include <reanimated/NativeModules/ReanimatedModuleProxy.h>

#include <worklets/android/WorkletsModule.h>

#include <ReactCommon/CallInvokerHolder.h>
#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <react/fabric/JFabricUIManager.h>
#include <react/jni/WritableNativeMap.h>
#include <react/renderer/scheduler/Scheduler.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace facebook::jni;

class NativeProxy : public jni::HybridClass<NativeProxy>,
                    std::enable_shared_from_this<NativeProxy> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/NativeProxy;";
  static jni::local_ref<jhybriddata> initHybrid(
      jni::alias_ref<jhybridobject> jThis,
      jni::alias_ref<WorkletsModule::javaobject> jWorkletsModule,
      jlong jsContext,
      jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
          jsCallInvokerHolder,
      jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
          fabricUIManager);

  static void registerNatives();

  ~NativeProxy();

 private:
  friend HybridBase;
  jni::global_ref<NativeProxy::javaobject> javaPart_;
  jsi::Runtime *rnRuntime_;
  std::shared_ptr<WorkletsModuleProxy> workletsModuleProxy_;
  std::shared_ptr<ReanimatedModuleProxy> reanimatedModuleProxy_;
#ifndef NDEBUG
  void checkJavaVersion();
  void injectCppVersion();
#endif // NDEBUG
  // removed temporarily, event listener mechanism needs to be fixed on RN side
  // std::shared_ptr<facebook::react::Scheduler> reactScheduler_;
  // std::shared_ptr<EventListener> eventListener_;
  void installJSIBindings();
  void synchronouslyUpdateUIProps(
      const std::vector<int> &intBuffer,
      const std::vector<double> &doubleBuffer);
  PlatformDepMethodsHolder getPlatformDependentMethods();

  double getAnimationTimestamp();
  bool isAnyHandlerWaitingForEvent(
      const std::string &eventName,
      const int emitterReactTag);
  void performOperations();
  bool getIsReducedMotion();
  void requestRender(std::function<void(double)> onRender);
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
  void handleEvent(
      jni::alias_ref<JString> eventName,
      jint emitterReactTag,
      jni::alias_ref<react::WritableMap> event);

  /***
   * Wraps a method of `NativeProxy` in a function object capturing `this`
   * @tparam TReturn return type of passed method
   * @tparam TParams parameter types of passed method
   * @param methodPtr pointer to method to be wrapped
   * @return a function object with the same signature as the method, calling
   * that method on `this`
   */
  template <class TReturn, class... TParams>
  std::function<TReturn(TParams...)> bindThis(
      TReturn (NativeProxy::*methodPtr)(TParams...)) {
    // It's probably safe to pass `this` as reference here...
    return [this, methodPtr](TParams &&...args) {
      return (this->*methodPtr)(std::forward<TParams>(args)...);
    };
  }

  template <class Signature>
  JMethod<Signature> getJniMethod(std::string const &methodName) {
    return javaPart_->getClass()->getMethod<Signature>(methodName.c_str());
  }

  explicit NativeProxy(
      jni::alias_ref<NativeProxy::jhybridobject> jThis,
      const std::shared_ptr<WorkletsModuleProxy> &workletsModuleProxy,
      jsi::Runtime *rnRuntime,
      const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
      jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
          fabricUIManager);

  void invalidateCpp();
};

} // namespace reanimated
