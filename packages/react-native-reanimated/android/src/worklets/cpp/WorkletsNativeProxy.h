#pragma once

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/fabric/JFabricUIManager.h>
#include <react/renderer/scheduler/Scheduler.h>
#if REACT_NATIVE_MINOR_VERSION >= 74
#include <react/jni/JRuntimeExecutor.h>
#endif // REACT_NATIVE_MINOR_VERSION >= 74
#endif

#include <ReactCommon/CallInvokerHolder.h>
#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <react/jni/CxxModuleWrapper.h>
#include <react/jni/JMessageQueueThread.h>
#include <react/jni/WritableNativeMap.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

#include "AndroidUIScheduler.h"
#include "CommonWorkletsModule.h"
#include "JNIHelper.h"
#include "UIScheduler.h"

namespace reanimated {

using namespace facebook;
using namespace facebook::jni;

class WorkletsNativeProxy : public jni::HybridClass<WorkletsNativeProxy> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/worklets/WorkletsNativeProxy;";
  static jni::local_ref<jhybriddata> initHybrid(
      jni::alias_ref<jhybridobject> jThis,
      jlong jsContext,
      jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
          jsCallInvokerHolder,
      jni::alias_ref<AndroidUIScheduler::javaobject> androidUiScheduler,
      jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
#ifdef RCT_NEW_ARCH_ENABLED
      jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
          fabricUIManager,
#endif
      const std::string &valueUnpackerCode);

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
  static jni::local_ref<jhybriddata> initHybridBridgeless(
      jni::alias_ref<jhybridobject> jThis,
      jlong jsContext,
      jni::alias_ref<react::JRuntimeExecutor::javaobject> runtimeExecutorHolder,
      jni::alias_ref<AndroidUIScheduler::javaobject> androidUiScheduler,
      jni::alias_ref<LayoutAnimations::javaobject> layoutAnimations,
      jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
      jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
          fabricUIManager,
      const std::string &valueUnpackerCode);
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED
  static void registerNatives();

  inline std::shared_ptr<reanimated::CommonWorkletsModule>
  getCommonWorkletsModule() {
    return commonWorkletsModule_;
  }

 private:
  friend HybridBase;
  jni::global_ref<WorkletsNativeProxy::javaobject> javaPart_;
  jsi::Runtime *rnRuntime_;
  std::shared_ptr<reanimated::CommonWorkletsModule> commonWorkletsModule_;
#ifndef NDEBUG
  void checkJavaVersion(jsi::Runtime &);
  void injectCppVersion();
#endif // NDEBUG
#ifdef RCT_NEW_ARCH_ENABLED
  // removed temporarily, event listener mechanism needs to be fixed on RN side
  // std::shared_ptr<facebook::react::Scheduler> reactScheduler_;
  // std::shared_ptr<EventListener> eventListener_;
#endif // RCT_NEW_ARCH_ENABLED
  void installJSIBindings();
  bool getIsReducedMotion();

  /***
   * Wraps a method of `WorkletsNativeProxy` in a function object capturing
   * `this`
   * @tparam TReturn return type of passed method
   * @tparam TParams paramater types of passed method
   * @param methodPtr pointer to method to be wrapped
   * @return a function object with the same signature as the method, calling
   * that method on `this`
   */
  template <class TReturn, class... TParams>
  std::function<TReturn(TParams...)> bindThis(
      TReturn (WorkletsNativeProxy::*methodPtr)(TParams...)) {
    return [this, methodPtr](TParams &&...args) {
      return (this->*methodPtr)(std::forward<TParams>(args)...);
    };
  }

  template <class Signature>
  JMethod<Signature> getJniMethod(std::string const &methodName) {
    return javaPart_->getClass()->getMethod<Signature>(methodName.c_str());
  }

  explicit WorkletsNativeProxy(
      jni::alias_ref<WorkletsNativeProxy::jhybridobject> jThis,
      jsi::Runtime *rnRuntime,
      const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
      const std::shared_ptr<reanimated::UIScheduler> &uiScheduler,
      jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
#ifdef RCT_NEW_ARCH_ENABLED
      jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
          fabricUIManager,
#endif
      const std::string &valueUnpackerCode);

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
  explicit WorkletsNativeProxy(
      jni::alias_ref<WorkletsNativeProxy::jhybridobject> jThis,
      jsi::Runtime *rnRuntime,
      RuntimeExecutor runtimeExecutor,
      const std::shared_ptr<UIScheduler> &uiScheduler,
      jni::global_ref<LayoutAnimations::javaobject> layoutAnimations,
      jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
      jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
          fabricUIManager,
      const std::string &valueUnpackerCode);
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED

#ifdef RCT_NEW_ARCH_ENABLED
  void commonInit(jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
                      &fabricUIManager);
#endif // RCT_NEW_ARCH_ENABLED
};

} // namespace reanimated
