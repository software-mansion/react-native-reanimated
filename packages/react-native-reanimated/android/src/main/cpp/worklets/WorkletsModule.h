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
#include <utility>

#include "AndroidUIScheduler.h"
#include "NativeWorkletsModule.h"
#include "UIScheduler.h"

namespace reanimated {

using namespace facebook;
using namespace facebook::jni;

class WorkletsModule : public jni::HybridClass<WorkletsModule> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/worklets/WorkletsModule;";

  static jni::local_ref<jhybriddata> initHybrid(
      jni::alias_ref<jhybridobject> jThis,
      jlong jsContext,
      jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
          jsCallInvokerHolder,
      jni::alias_ref<AndroidUIScheduler::javaobject> androidUiScheduler,
      jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
      const std::string &valueUnpackerCode);

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)

  static jni::local_ref<jhybriddata> initHybridBridgeless(
      jni::alias_ref<jhybridobject> jThis,
      jlong jsContext,
      jni::alias_ref<react::JRuntimeExecutor::javaobject> runtimeExecutorHolder,
      jni::alias_ref<AndroidUIScheduler::javaobject> androidUiScheduler,
      jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
      const std::string &valueUnpackerCode);

#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED

  static void registerNatives();

  inline std::shared_ptr<reanimated::NativeWorkletsModule>
  getNativeWorkletsModule() {
    return NativeWorkletsModule_;
  }

 private:
  friend HybridBase;
  jni::global_ref<WorkletsModule::javaobject> javaPart_;
  jsi::Runtime *rnRuntime_;
  std::shared_ptr<reanimated::NativeWorkletsModule> NativeWorkletsModule_;

  void installJSIBindings();

  /***
   * Wraps a method of `WorkletsModule` in a function object capturing
   * `this`
   * @tparam TReturn return type of passed method
   * @tparam TParams paramater types of passed method
   * @param methodPtr pointer to method to be wrapped
   * @return a function object with the same signature as the method, calling
   * that method on `this`
   */
  template <class TReturn, class... TParams>
  std::function<TReturn(TParams...)> bindThis(
      TReturn (WorkletsModule::*methodPtr)(TParams...)) {
    return [this, methodPtr](TParams &&...args) {
      return (this->*methodPtr)(std::forward<TParams>(args)...);
    };
  }

  template <class Signature>
  JMethod<Signature> getJniMethod(std::string const &methodName) {
    return javaPart_->getClass()->getMethod<Signature>(methodName.c_str());
  }

  explicit WorkletsModule(
      jni::alias_ref<WorkletsModule::jhybridobject> jThis,
      jsi::Runtime *rnRuntime,
      const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
      const std::shared_ptr<reanimated::UIScheduler> &uiScheduler,
      jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
      const std::string &valueUnpackerCode);

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)

  explicit WorkletsModule(
      jni::alias_ref<WorkletsModule::jhybridobject> jThis,
      jsi::Runtime *rnRuntime,
      RuntimeExecutor runtimeExecutor,
      const std::shared_ptr<UIScheduler> &uiScheduler,
      jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
      const std::string &valueUnpackerCode);

#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED
};

} // namespace reanimated
