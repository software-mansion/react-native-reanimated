#include <react/jni/JMessageQueueThread.h>

#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#include <worklets/android/AnimationFrameCallback.h>
#include <worklets/android/WorkletsModule.h>

#include <utility>

namespace worklets {

using namespace facebook;
using namespace react;

WorkletsModule::WorkletsModule(
    jni::alias_ref<jhybridobject> jThis,
    const std::shared_ptr<MessageQueueThread> &messageQueueThread,
    const std::shared_ptr<UIScheduler> &uiScheduler)
    : javaPart_(jni::make_global(jThis)),
      messageQueueThread_(messageQueueThread),
      uiScheduler_(uiScheduler) {}

jni::local_ref<WorkletsModule::jhybriddata> WorkletsModule::initHybrid(
    jni::alias_ref<jhybridobject> jThis,
    jni::alias_ref<JavaMessageQueueThread::javaobject> javaMessageQueueThread,
    jni::alias_ref<worklets::AndroidUIScheduler::javaobject>
        androidUIScheduler) {
  const auto &messageQueueThread = std::make_shared<JMessageQueueThread>(javaMessageQueueThread);
  const auto &uiScheduler = androidUIScheduler->cthis()->getUIScheduler();
  return makeCxxInstance(jThis, messageQueueThread, uiScheduler);
}

std::function<void(std::function<void(const double)>)>
WorkletsModule::getForwardedRequestAnimationFrame() {
  return [javaPart =
              javaPart_](std::function<void(const double)> &&callback) -> void {
    static const auto jRequestAnimationFrame =
        javaPart->getClass()
            ->getMethod<void(AnimationFrameCallback::javaobject)>(
                "requestAnimationFrame");
    jRequestAnimationFrame(
        javaPart.get(),
        AnimationFrameCallback::newObjectCxxArgs(std::move(callback)).get());
  };
}

void WorkletsModule::invalidateCpp() {
  javaPart_.reset();
  messageQueueThread_.reset();
  uiScheduler_.reset();
  workletsModuleProxy_.reset();
}

void WorkletsModule::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", WorkletsModule::initHybrid),
      makeNativeMethod(
          "getBindingsInstaller", WorkletsModule::getBindingsInstaller),
      makeNativeMethod("invalidateCpp", WorkletsModule::invalidateCpp),
  });
}

jni::local_ref<BindingsInstallerHolder::javaobject>
WorkletsModule::getBindingsInstaller() {
  return jni::make_local(BindingsInstallerHolder::newObjectCxxArgs(
      [&](jsi::Runtime &rnRuntime,
          const std::shared_ptr<CallInvoker> &jsCallInvoker) {
        workletsModuleProxy_ = std::make_shared<WorkletsModuleProxy>(
            rnRuntime,
            messageQueueThread_,
            jsCallInvoker,
            uiScheduler_,
            getForwardedRequestAnimationFrame());
        RNRuntimeWorkletDecorator::decorate(rnRuntime, workletsModuleProxy_);
      }));
}

} // namespace worklets
