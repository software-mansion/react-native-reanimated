#include <android/log.h>
#include <fbjni/fbjni.h>
#include <jsi/JSIDynamic.h>
#include <jsi/jsi.h>
#include <react/jni/JMessageQueueThread.h>
#include <react/jni/ReadableNativeArray.h>
#include <react/jni/ReadableNativeMap.h>
#include <functional>
#ifdef RCT_NEW_ARCH_ENABLED
#include <react/fabric/Binding.h>
#endif // RCT_NEW_ARCH_ENABLED

#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#include <worklets/android/AnimationFrameCallback.h>
#include <worklets/android/WorkletsModule.h>

#include <utility>

namespace worklets {

using namespace facebook;
using namespace react;

WorkletsModule::WorkletsModule(
    jni::alias_ref<jhybridobject> jThis,
    jsi::Runtime *rnRuntime,
    const std::string &valueUnpackerCode,
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
    const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
    const std::shared_ptr<worklets::JSScheduler> &jsScheduler,
    const std::shared_ptr<UIScheduler> &uiScheduler)
    : javaPart_(jni::make_global(jThis)),
      rnRuntime_(rnRuntime),
      forwardedRequestAnimationFrame_(
          std::make_shared<
              std::function<void(std::function<void(const double)>)>>(
              [this](std::function<void(const double)> &&callback) -> void {
                requestAnimationFrame(std::move(callback));
              })),
      workletsModuleProxy_(std::make_shared<WorkletsModuleProxy>(
          *rnRuntime,
          valueUnpackerCode,
          std::make_shared<JMessageQueueThread>(messageQueueThread),
          jsCallInvoker,
          jsScheduler,
          uiScheduler,
          forwardedRequestAnimationFrame_)) {
  RNRuntimeWorkletDecorator::decorate(*rnRuntime_, workletsModuleProxy_);
}

jni::local_ref<WorkletsModule::jhybriddata> WorkletsModule::initHybrid(
    jni::alias_ref<jhybridobject> jThis,
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
      jThis,
      rnRuntime,
      valueUnpackerCode,
      messageQueueThread,
      jsCallInvoker,
      jsScheduler,
      uiScheduler);
}

void WorkletsModule::requestAnimationFrame(
    std::function<void(const double)> callback) {
  static const auto jRequestAnimationFrame =
      getJniMethod<void(AnimationFrameCallback::javaobject)>(
          "requestAnimationFrame");
  jRequestAnimationFrame(
      javaPart_.get(),
      AnimationFrameCallback::newObjectCxxArgs(std::move(callback)).get());
}

void WorkletsModule::invalidateCpp() {
  javaPart_.reset();
  workletsModuleProxy_.reset();
}

void WorkletsModule::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", WorkletsModule::initHybrid),
      makeNativeMethod("invalidateCpp", WorkletsModule::invalidateCpp),
  });
}

} // namespace worklets
