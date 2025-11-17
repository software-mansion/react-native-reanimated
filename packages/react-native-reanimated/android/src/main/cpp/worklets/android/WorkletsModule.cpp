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

#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#include <worklets/android/WorkletsModule.h>

namespace worklets {

using namespace facebook;
using namespace react;

WorkletsModule::WorkletsModule(
    jsi::Runtime *rnRuntime,
    const std::string &valueUnpackerCode,
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
    const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
    const std::shared_ptr<worklets::JSScheduler> &jsScheduler,
    const std::shared_ptr<UIScheduler> &uiScheduler)
    : rnRuntime_(rnRuntime),
      workletsModuleProxy_(std::make_shared<WorkletsModuleProxy>(
          valueUnpackerCode,
          std::make_shared<JMessageQueueThread>(messageQueueThread),
          jsCallInvoker,
          jsScheduler,
          uiScheduler)) {
  RNRuntimeWorkletDecorator::decorate(*rnRuntime_, workletsModuleProxy_);
}

jni::local_ref<WorkletsModule::jhybriddata> WorkletsModule::initHybrid(
    jni::alias_ref<jhybridobject> /*jThis*/,
    jlong jsContext,
    const std::string &valueUnpackerCode,
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
    jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
        jsCallInvokerHolder,
    jni::alias_ref<worklets::AndroidUIScheduler::javaobject>
        androidUIScheduler) {
  auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
  auto rnRuntime = reinterpret_cast<jsi::Runtime *>(jsContext);
  auto jsScheduler =
      std::make_shared<worklets::JSScheduler>(*rnRuntime, jsCallInvoker);
  auto uiScheduler = androidUIScheduler->cthis()->getUIScheduler();
  return makeCxxInstance(
      rnRuntime,
      valueUnpackerCode,
      messageQueueThread,
      jsCallInvoker,
      jsScheduler,
      uiScheduler);
}

void WorkletsModule::invalidateCpp() {
  workletsModuleProxy_.reset();
}

void WorkletsModule::registerNatives() {
  registerHybrid(
      {makeNativeMethod("initHybrid", WorkletsModule::initHybrid),
       makeNativeMethod("invalidateCpp", WorkletsModule::invalidateCpp)});
}

} // namespace worklets
