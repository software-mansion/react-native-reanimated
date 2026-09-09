#include <worklets/Tools/ScriptBuffer.h>
#include <worklets/WorkletRuntime/BundleModeConfig.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>
#include <worklets/android/AnimationFrameCallback.h>
#include <worklets/android/WorkletsModule.h>

#include <memory>
#include <string>
#include <utility>

namespace worklets {

using namespace facebook;
using namespace react;

WorkletsModule::WorkletsModule(jni::alias_ref<jhybridobject> jThis, // NOLINT //(performance-unnecessary-value-param)
                               const BundleModeConfig &bundleModeConfig,
                               jsi::Runtime *rnRuntime,
                               const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
                               const std::shared_ptr<UIScheduler> &uiScheduler,
                               jni::global_ref<JWorkletsNetworking::javaobject> jWorkletsNetworking)
    : javaPart_(jni::make_global(jThis)),
      rnRuntime_(rnRuntime),
      rnRuntimeStatus_(std::make_shared<RNRuntimeStatus>()),
      workletsModuleProxy_(std::make_shared<WorkletsModuleProxy>(
          *rnRuntime,
          jsCallInvoker,
          uiScheduler,
          getIsOnJSQueueThread(),
          getRuntimeBindings(bundleModeConfig.enabled, *rnRuntime, std::move(jWorkletsNetworking)),
          bundleModeConfig,
          rnRuntimeStatus_)) {}

jni::local_ref<WorkletsModule::jhybriddata> WorkletsModule::initHybrid(
    jni::alias_ref<jhybridobject> jThis, // NOLINT //(performance-unnecessary-value-param)
    jboolean bundleModeEnabled,
    jlong jsContext,
    jni::alias_ref<facebook::react::CallInvokerHolder::javaobject> jsCallInvokerHolder,
    jni::alias_ref<worklets::AndroidUIScheduler::javaobject> androidUIScheduler,
    jni::alias_ref<JScriptBufferWrapper::javaobject>
        jScriptBufferWrapper, // NOLINT //(performance-unnecessary-value-param)
    jni::alias_ref<JWorkletsNetworking::javaobject>
        jWorkletsNetworking // NOLINT //(performance-unnecessary-value-param)
) {
  auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
  auto rnRuntime = reinterpret_cast<jsi::Runtime *>(jsContext); // NOLINT //(performance-no-int-to-ptr)
  auto uiScheduler = androidUIScheduler->cthis()->getUIScheduler();

  std::shared_ptr<const ScriptBuffer> script = nullptr;
  std::string sourceURL;
  if (bundleModeEnabled) {
    auto cxxWrapper = jScriptBufferWrapper->cthis();
    script = cxxWrapper->getScript();
    sourceURL = cxxWrapper->getSourceUrl();
  }

  return makeCxxInstance(jThis,
                         BundleModeConfig{
                             .enabled = static_cast<bool>(bundleModeEnabled),
                             .script = script,
                             .sourceURL = sourceURL,
                         },
                         rnRuntime,
                         jsCallInvoker,
                         uiScheduler,
                         jni::make_global(jWorkletsNetworking));
}

std::shared_ptr<RuntimeBindings> WorkletsModule::getRuntimeBindings(
    const bool bundleModeEnabled,
    jsi::Runtime &rnRuntime,
    jni::global_ref<JWorkletsNetworking::javaobject> jWorkletsNetworking) {
  return std::make_shared<RuntimeBindings>(RuntimeBindings{
      .requestAnimationFrame = getRequestAnimationFrame(),
      .nativeLoggingHook =
          bundleModeEnabled ? extractNativeLoggingHookFromRNRuntime(rnRuntime) : RuntimeBindings::NativeLoggingHook{},
      .networkingBackend =
          bundleModeEnabled ? std::make_shared<AndroidNetworkingBackend>(std::move(jWorkletsNetworking)) : nullptr});
}

RuntimeBindings::RequestAnimationFrame WorkletsModule::getRequestAnimationFrame() {
  return [javaPart = javaPart_](std::function<void(const double)> &&callback) -> void {
    static const auto jRequestAnimationFrame =
        javaPart->getClass()->getMethod<void(AnimationFrameCallback::javaobject)>("requestAnimationFrame");
    jRequestAnimationFrame(javaPart.get(), AnimationFrameCallback::newObjectCxxArgs(std::move(callback)).get());
  };
}

std::function<bool()> WorkletsModule::getIsOnJSQueueThread() {
  return [javaPart = javaPart_]() -> bool {
    static const auto jIsOnJSQueueThread = javaPart->getClass()->getMethod<jboolean()>("isOnJSQueueThread");
    return jIsOnJSQueueThread(javaPart);
  };
}

void WorkletsModule::invalidateCpp() {
  rnRuntimeStatus_->setDead();
  javaPart_.reset();
  workletsModuleProxy_.reset();
}

void WorkletsModule::startCpp() {
  workletsModuleProxy_->start();
}

void WorkletsModule::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", WorkletsModule::initHybrid),
      makeNativeMethod("invalidateCpp", WorkletsModule::invalidateCpp),
      makeNativeMethod("startCpp", WorkletsModule::startCpp),
  });
}

} // namespace worklets
