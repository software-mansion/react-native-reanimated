#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#include <worklets/android/AnimationFrameCallback.h>
#include <worklets/android/WorkletsModule.h>

#include <memory>
#include <utility>

namespace worklets {

using namespace facebook;
using namespace react;

WorkletsModule::WorkletsModule(
    jni::alias_ref<jhybridobject> jThis,
    jsi::Runtime *rnRuntime,
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
    const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    const std::shared_ptr<const BigStringBuffer> &script,
    const std::string &sourceURL)
    : javaPart_(jni::make_global(jThis)),
      rnRuntime_(rnRuntime),
      workletsModuleProxy_(std::make_shared<WorkletsModuleProxy>(
          *rnRuntime,
          std::make_shared<JMessageQueueThread>(messageQueueThread),
          jsCallInvoker,
          uiScheduler,
          getIsOnJSQueueThread(),
          getForwardedRequestAnimationFrame(),
          script,
          sourceURL)) {
  auto jsiWorkletsModuleProxy =
      workletsModuleProxy_->createJSIWorkletsModuleProxy();
  auto optimizedJsiWorkletsModuleProxy = jsi_utils::optimizedFromHostObject(
      *rnRuntime_,
      std::static_pointer_cast<jsi::HostObject>(
          std::move(jsiWorkletsModuleProxy)));
  RNRuntimeWorkletDecorator::decorate(
      *rnRuntime_,
      std::move(optimizedJsiWorkletsModuleProxy),
      workletsModuleProxy_->getJSLogger());
}

jni::local_ref<WorkletsModule::jhybriddata> WorkletsModule::initHybrid(
    jni::alias_ref<jhybridobject> jThis,
    jlong jsContext,
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
    jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
        jsCallInvokerHolder,
    jni::alias_ref<worklets::AndroidUIScheduler::javaobject> androidUIScheduler
#ifdef WORKLETS_BUNDLE_MODE
    ,
    jni::alias_ref<facebook::react::BigStringBufferWrapper::javaobject>
        scriptWrapper,
    const std::string &sourceURL
#endif // WORKLETS_BUNDLE_MODE
) {
  auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
  auto rnRuntime = reinterpret_cast<jsi::Runtime *>(jsContext);
  auto uiScheduler = androidUIScheduler->cthis()->getUIScheduler();

  std::shared_ptr<const BigStringBuffer> script = nullptr;
#ifdef WORKLETS_BUNDLE_MODE
  script = scriptWrapper->cthis()->getScript();
#else
  const auto sourceURL = std::string{};
#endif // WORKLETS_BUNDLE_MODE

  return makeCxxInstance(
      jThis,
      rnRuntime,
      messageQueueThread,
      jsCallInvoker,
      uiScheduler,
      script,
      sourceURL);
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

std::function<bool()> WorkletsModule::getIsOnJSQueueThread() {
  return [javaPart = javaPart_]() -> bool {
    return javaPart->getClass()
        ->getMethod<jboolean()>("isOnJSQueueThread")
        .operator()(javaPart);
  };
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
