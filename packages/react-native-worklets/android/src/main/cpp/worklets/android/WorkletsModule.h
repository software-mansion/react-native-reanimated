#pragma once

#include <ReactCommon/CallInvokerHolder.h>
#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <react/jni/JMessageQueueThread.h>
#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/Tools/Defs.h>
#include <worklets/Tools/ScriptBuffer.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>
#include <worklets/android/AndroidUIScheduler.h>
#include <worklets/android/JScriptBufferWrapper.h>

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
      jni::alias_ref<worklets::AndroidUIScheduler::javaobject> androidUIScheduler,
      jni::alias_ref<JScriptBufferWrapper::javaobject> jScriptBufferWrapper);

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
      const std::shared_ptr<const ScriptBuffer> &script,
      const std::string &sourceURL);

  void startCpp();

  void invalidateCpp();

  template <class Signature>
  JMethod<Signature> getJniMethod(std::string const &methodName) {
    return javaPart_->getClass()->getMethod<Signature>(methodName.c_str());
  }

  RuntimeBindings::RequestAnimationFrame getRequestAnimationFrame();
#if defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
  RuntimeBindings::AbortRequest getAbortRequest();
  RuntimeBindings::ClearCookies getClearCookies();
  RuntimeBindings::SendRequest getSendRequest();
#endif // defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)

  std::function<bool()> getIsOnJSQueueThread();

  friend HybridBase;
  jni::global_ref<WorkletsModule::javaobject> javaPart_;
  jsi::Runtime *rnRuntime_;
  std::shared_ptr<WorkletsModuleProxy> workletsModuleProxy_;
};

} // namespace worklets
