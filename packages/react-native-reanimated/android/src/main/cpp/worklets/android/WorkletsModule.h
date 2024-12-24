#pragma once

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/fabric/JFabricUIManager.h>
#include <react/jni/JRuntimeExecutor.h>
#include <react/renderer/scheduler/Scheduler.h>
#endif // RCT_NEW_ARCH_ENABLED

#include <ReactCommon/CallInvokerHolder.h>
#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <react/jni/CxxModuleWrapper.h>
#include <react/jni/JMessageQueueThread.h>
#include <react/jni/WritableNativeMap.h>

#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/android/AndroidUIScheduler.h>

#include <memory>
#include <string>

namespace worklets {

using namespace facebook;
using namespace facebook::jni;

class WorkletsModule : public jni::HybridClass<WorkletsModule> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/worklets/WorkletsModule;";

  static jni::local_ref<jhybriddata> initHybrid(
      jni::alias_ref<jhybridobject> /*jThis*/,
      jlong jsContext,
      const std::string &valueUnpackerCode,
      jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
      jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
          jsCallInvokerHolder,
      jni::alias_ref<worklets::AndroidUIScheduler::javaobject>
          androidUIScheduler);

  static void registerNatives();

  inline std::shared_ptr<WorkletsModuleProxy> getWorkletsModuleProxy() {
    return workletsModuleProxy_;
  }

 private:
  explicit WorkletsModule(
      jsi::Runtime *rnRuntime,
      const std::string &valueUnpackerCode,
      jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
      const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
      const std::shared_ptr<worklets::JSScheduler> &jsScheduler,
      const std::shared_ptr<UIScheduler> &uiScheduler);

  void invalidateCpp();

  friend HybridBase;
  jsi::Runtime *rnRuntime_;
  std::shared_ptr<WorkletsModuleProxy> workletsModuleProxy_;
};

} // namespace worklets
