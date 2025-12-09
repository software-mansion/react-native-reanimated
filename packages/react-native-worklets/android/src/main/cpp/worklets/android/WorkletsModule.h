#pragma once

#include <ReactCommon/CallInvokerHolder.h>
#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <react/jni/JMessageQueueThread.h>
#include <worklets/Tools/Defs.h>
#ifdef WORKLETS_BUNDLE_MODE
#include <react/fabric/BundleWrapper.h>
#endif // WORKLETS_BUNDLE_MODE

#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>
#include <worklets/android/AndroidUIScheduler.h>

#include <memory>
#include <string>

namespace worklets {

using namespace facebook;
using namespace facebook::jni;

class WorkletsModule : public jni::HybridClass<WorkletsModule> {
 public:
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/worklets/WorkletsModule;";

  static jni::local_ref<jhybriddata> initHybrid(
      jni::alias_ref<jhybridobject> jThis,
      jlong jsContext,
      jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
      jni::alias_ref<facebook::react::CallInvokerHolder::javaobject> jsCallInvokerHolder,
      jni::alias_ref<worklets::AndroidUIScheduler::javaobject> androidUIScheduler
#ifdef WORKLETS_BUNDLE_MODE
      ,
      jni::alias_ref<facebook::react::BundleWrapper::javaobject> bundleWrapper,
      const std::string &sourceURL
#endif // WORKLETS_BUNDLE_MODE
  );

  static void registerNatives();

  inline std::shared_ptr<WorkletsModuleProxy> getWorkletsModuleProxy() {
    return workletsModuleProxy_;
  }

 private:
  explicit WorkletsModule(
      jni::alias_ref<jhybridobject> jThis,
      jsi::Runtime *rnRuntime,
      jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
      const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
      const std::shared_ptr<UIScheduler> &uiScheduler,
      const std::shared_ptr<const JSBigStringBuffer> &bundle,
      const std::string &sourceURL);

  void invalidateCpp();

  template <class Signature>
  JMethod<Signature> getJniMethod(std::string const &methodName) {
    return javaPart_->getClass()->getMethod<Signature>(methodName.c_str());
  }

  RuntimeBindings::RequestAnimationFrame getRequestAnimationFrame();

  std::function<bool()> getIsOnJSQueueThread();

  friend HybridBase;
  jni::global_ref<WorkletsModule::javaobject> javaPart_;
  jsi::Runtime *rnRuntime_;
  std::shared_ptr<WorkletsModuleProxy> workletsModuleProxy_;
};

} // namespace worklets
