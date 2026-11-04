#include <worklets/Tools/JSScheduler.h>
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

WorkletsModule::WorkletsModule(
    jni::alias_ref<jhybridobject> jThis, // NOLINT //(performance-unnecessary-value-param)
    jsi::Runtime *rnRuntime,
    const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    jni::global_ref<JNetworking::javaobject> networking)
    : javaPart_(jni::make_global(jThis)),
      rnRuntime_(rnRuntime),
      rnRuntimeStatus_(std::make_shared<RNRuntimeStatus>()),
      initializer_(std::make_shared<WorkletsModuleProxyInitializer>(
          std::make_shared<JSScheduler>(*rnRuntime, jsCallInvoker, getIsOnJSQueueThread()),
          uiScheduler,
          getRuntimeBindings(javaPart_, std::move(networking)),
          rnRuntimeStatus_)) {}

jni::local_ref<WorkletsModule::jhybriddata> WorkletsModule::initHybrid(
    jni::alias_ref<jhybridobject> jThis, // NOLINT //(performance-unnecessary-value-param)
    jlong jsContext,
    jni::alias_ref<facebook::react::CallInvokerHolder::javaobject> jsCallInvokerHolder,
    jni::alias_ref<worklets::AndroidUIScheduler::javaobject> androidUIScheduler,
    jni::alias_ref<JNetworking::javaobject> networking // NOLINT //(performance-unnecessary-value-param)
) {
  auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
  auto rnRuntime = reinterpret_cast<jsi::Runtime *>(jsContext); // NOLINT //(performance-no-int-to-ptr)
  auto uiScheduler = androidUIScheduler->cthis()->getUIScheduler();
  return makeCxxInstance(jThis, rnRuntime, jsCallInvoker, uiScheduler, jni::make_global(networking));
}

void WorkletsModule::prepareProxyCpp() {
  initializer_->prepareProxy();
}

void WorkletsModule::beginBundleModeAOTCpp() {
  initializer_->beginBundleModeAOT();
}

void WorkletsModule::prepareBundleModeAOTCpp() {
  initializer_->prepareBundleModeAOT([this] { return loadBundleModeConfig(); });
}

void WorkletsModule::installTurboModuleCpp(jboolean bundleModeEnabled) {
  workletsModuleProxy_ = initializer_->finalize(
      *rnRuntime_, static_cast<bool>(bundleModeEnabled), [this] { return loadBundleModeConfig(); });
}

std::shared_ptr<RuntimeBindings> WorkletsModule::getRuntimeBindings(
    const jni::global_ref<jhybridobject> &javaPart,
    jni::global_ref<JNetworking::javaobject> networking) {
  return std::make_shared<RuntimeBindings>(RuntimeBindings{
      .requestAnimationFrame = getRequestAnimationFrame(javaPart),
      .getCurrentFrameTimestamp = getCurrentFrameTimestamp(javaPart),
      .nativeLoggingHook = makeNativeLoggingHook(),
      .networkingBackend = std::make_shared<AndroidNetworkingBackend>(std::move(networking))});
}

BundleModeConfig WorkletsModule::loadBundleModeConfig() {
  static const auto jCreateScriptBufferWrapper =
      getJniMethod<JScriptBufferWrapper::javaobject()>("createScriptBufferWrapper");
  const auto jScriptBufferWrapper = jCreateScriptBufferWrapper(javaPart_.get());
  const auto scriptBufferWrapper = jScriptBufferWrapper->cthis();
  return BundleModeConfig{
      .enabled = true, .script = scriptBufferWrapper->getScript(), .sourceURL = scriptBufferWrapper->getSourceUrl()};
}

RuntimeBindings::RequestAnimationFrame WorkletsModule::getRequestAnimationFrame(
    const jni::global_ref<jhybridobject> &javaPart) {
  return [javaPart](std::function<void(const double)> &&callback) -> void {
    static const auto jRequestAnimationFrame =
        javaPart->getClass()->getMethod<void(AnimationFrameCallback::javaobject)>("requestAnimationFrame");
    jRequestAnimationFrame(javaPart.get(), AnimationFrameCallback::newObjectCxxArgs(std::move(callback)).get());
  };
}

RuntimeBindings::GetCurrentFrameTimestamp WorkletsModule::getCurrentFrameTimestamp(
    const jni::global_ref<jhybridobject> &javaPart) {
  return [javaPart]() -> double {
    static const auto jGetCurrentFrameTimestamp =
        javaPart->getClass()->getMethod<jdouble()>("getCurrentFrameTimestamp");
    return jGetCurrentFrameTimestamp(javaPart.get());
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
  initializer_->invalidate();
  initializer_.reset();
  javaPart_.reset();
  workletsModuleProxy_.reset();
}

void WorkletsModule::startCpp() {
  workletsModuleProxy_->start();
}

void WorkletsModule::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", WorkletsModule::initHybrid),
      makeNativeMethod("prepareProxyCpp", WorkletsModule::prepareProxyCpp),
      makeNativeMethod("beginBundleModeAOTCpp", WorkletsModule::beginBundleModeAOTCpp),
      makeNativeMethod("prepareBundleModeAOTCpp", WorkletsModule::prepareBundleModeAOTCpp),
      makeNativeMethod("installTurboModuleCpp", WorkletsModule::installTurboModuleCpp),
      makeNativeMethod("invalidateCpp", WorkletsModule::invalidateCpp),
      makeNativeMethod("startCpp", WorkletsModule::startCpp),
  });
}

} // namespace worklets
