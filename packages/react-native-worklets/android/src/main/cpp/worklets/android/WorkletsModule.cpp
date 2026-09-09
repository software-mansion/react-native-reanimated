#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/ScriptBuffer.h>
#include <worklets/WorkletRuntime/BundleModeConfig.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>
#include <worklets/android/AnimationFrameCallback.h>
#include <worklets/android/WorkletsModule.h>

#ifdef WORKLETS_FETCH_PREVIEW_ENABLED
#include <folly/json/dynamic.h>
#include <jni.h>
#include <jsi/JSIDynamic.h>
#include <react/jni/JCallback.h>
#include <react/jni/ReadableNativeArray.h>
#include <react/jni/ReadableNativeMap.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>
#include <worklets/android/JWorkletRuntimeWrapper.h>

#include <vector>
#endif // WORKLETS_FETCH_PREVIEW_ENABLED

#include <memory>
#include <string>
#include <utility>

namespace worklets {

using namespace facebook;
using namespace react;

namespace {

BundleModeConfig bundleModeConfigFromWrapper(
    const jni::alias_ref<JScriptBufferWrapper::javaobject> &jScriptBufferWrapper) {
  if (!jScriptBufferWrapper) {
    return BundleModeConfig{.enabled = false};
  }
  auto cxxWrapper = jScriptBufferWrapper->cthis();
  return BundleModeConfig{.enabled = true, .script = cxxWrapper->getScript(), .sourceURL = cxxWrapper->getSourceUrl()};
}

} // namespace

WorkletsModule::WorkletsModule(
    jni::alias_ref<jhybridobject> jThis, // NOLINT //(performance-unnecessary-value-param)
    jsi::Runtime *rnRuntime,
    const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
    const std::shared_ptr<UIScheduler> &uiScheduler)
    : javaPart_(jni::make_global(jThis)),
      rnRuntime_(rnRuntime),
      rnRuntimeStatus_(std::make_shared<RNRuntimeStatus>()),
      initializer_(std::make_shared<WorkletsModuleProxyInitializer>(
          std::make_shared<JSScheduler>(*rnRuntime, jsCallInvoker, getIsOnJSQueueThread()),
          uiScheduler,
          getRuntimeBindings(),
          rnRuntimeStatus_)) {}

jni::local_ref<WorkletsModule::jhybriddata> WorkletsModule::initHybrid(
    jni::alias_ref<jhybridobject> jThis, // NOLINT //(performance-unnecessary-value-param)
    jlong jsContext,
    jni::alias_ref<facebook::react::CallInvokerHolder::javaobject> jsCallInvokerHolder,
    jni::alias_ref<worklets::AndroidUIScheduler::javaobject> androidUIScheduler) {
  auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
  auto rnRuntime = reinterpret_cast<jsi::Runtime *>(jsContext); // NOLINT //(performance-no-int-to-ptr)
  auto uiScheduler = androidUIScheduler->cthis()->getUIScheduler();
  return makeCxxInstance(jThis, rnRuntime, jsCallInvoker, uiScheduler);
}

void WorkletsModule::prepareProxyCpp() {
  initializer_->prepareProxy();
}

void WorkletsModule::installTurboModuleCpp(
    jboolean bundleModeEnabled,
    jni::alias_ref<JScriptBufferWrapper::javaobject>
        jScriptBufferWrapper // NOLINT //(performance-unnecessary-value-param)
) {
  workletsModuleProxy_ = initializer_->finalize(*rnRuntime_, bundleModeConfigFromWrapper(jScriptBufferWrapper));
}

std::shared_ptr<RuntimeBindings> WorkletsModule::getRuntimeBindings() {
  return std::make_shared<RuntimeBindings>(RuntimeBindings{
      .requestAnimationFrame = getRequestAnimationFrame(),
      .nativeLoggingHook = makeNativeLoggingHook()
#ifdef WORKLETS_FETCH_PREVIEW_ENABLED
          ,
      .abortRequest = getAbortRequest(),
      .clearCookies = getClearCookies(),
      .sendRequest = getSendRequest()
#endif // WORKLETS_FETCH_PREVIEW_ENABLED
  });
}

RuntimeBindings::RequestAnimationFrame WorkletsModule::getRequestAnimationFrame() {
  return [javaPart = javaPart_](std::function<void(const double)> &&callback) -> void {
    static const auto jRequestAnimationFrame =
        javaPart->getClass()->getMethod<void(AnimationFrameCallback::javaobject)>("requestAnimationFrame");
    jRequestAnimationFrame(javaPart.get(), AnimationFrameCallback::newObjectCxxArgs(std::move(callback)).get());
  };
}

#ifdef WORKLETS_FETCH_PREVIEW_ENABLED
RuntimeBindings::AbortRequest WorkletsModule::getAbortRequest() {
  return [javaPart = javaPart_](jsi::Runtime &rt, double requestId) -> void {
    static const auto jAbortRequest = javaPart->getClass()->getMethod<void(int, double)>("abortRequest");
    auto workletRuntime = WorkletRuntime::getWeakRuntimeFromJSIRuntime(rt).lock();
    jAbortRequest(javaPart.get(), static_cast<int>(workletRuntime->getRuntimeId()), requestId);
  };
}

RuntimeBindings::ClearCookies WorkletsModule::getClearCookies() {
  return [javaPart = javaPart_](jsi::Runtime &rt, jsi::Function &&responseSender) {
    static const auto jClearCookies = javaPart->getClass()->getMethod<void(JCallback::javaobject)>("clearCookies");
    auto jsiFunction = std::make_shared<jsi::Function>(std::move(responseSender));
    auto workletRuntime = WorkletRuntime::getWeakRuntimeFromJSIRuntime(rt);
    auto callback = [jsiFunction, workletRuntime](folly::dynamic args) {
      if (auto runtime = workletRuntime.lock()) {
        runtime->schedule([jsiFunction, args = std::move(args)](jsi::Runtime &rt) {
          std::vector<jsi::Value> jsArgs;
          for (auto &arg : args) {
            jsArgs.push_back(jsi::valueFromDynamic(rt, arg));
          }
          const jsi::Value *rawData = jsArgs.data();
          size_t size = jsArgs.size();
          jsiFunction->call(rt, rawData, size);
        });
      }
    };
    jClearCookies(javaPart.get(), JCxxCallbackImpl::newObjectCxxArgs(std::move(callback)).get());
  };
}

RuntimeBindings::SendRequest WorkletsModule::getSendRequest() {
  return [javaPart = javaPart_](
             jsi::Runtime &rt,
             jsi::String &method,
             jsi::String &url,
             double requestId,
             jsi::Array &headers,
             jsi::Object &data,
             jsi::String &responseType,
             bool incrementalUpdates,
             double timeout,
             bool withCredentials) {
    static const auto jSendRequest = javaPart->getClass()
                                         ->getMethod<void(
                                             JWorkletRuntimeWrapper::javaobject,
                                             std::string /* method */,
                                             std::string /* url */,
                                             double /* requestId */,
                                             ReadableNativeArray::javaobject /* headers */,
                                             ReadableNativeMap::javaobject /* data */,
                                             std::string /* responseType */,
                                             bool /* incrementalUpdates */,
                                             double /* timeout */,
                                             bool /* withCredentials */
                                             )>("sendRequest");
    auto workletRuntime = WorkletRuntime::getWeakRuntimeFromJSIRuntime(rt).lock();

    jSendRequest(
        javaPart.get(),
        JWorkletRuntimeWrapper::makeJWorkletRuntimeWrapper(workletRuntime).get(),
        method.utf8(rt),
        url.utf8(rt),
        requestId,
        ReadableNativeArray::newObjectCxxArgs(jsi::dynamicFromValue(rt, jsi::Value(std::move(headers)))).get(),
        ReadableNativeMap::newObjectCxxArgs(jsi::dynamicFromValue(rt, jsi::Value(std::move(data)))).get(),
        responseType.utf8(rt),
        incrementalUpdates,
        timeout,
        withCredentials);
  };
}
#endif // WORKLETS_FETCH_PREVIEW_ENABLED

std::function<bool()> WorkletsModule::getIsOnJSQueueThread() {
  return [javaPart = javaPart_]() -> bool {
    static const auto jIsOnJSQueueThread = javaPart->getClass()->getMethod<jboolean()>("isOnJSQueueThread");
    return jIsOnJSQueueThread(javaPart);
  };
}

void WorkletsModule::invalidateCpp() {
  rnRuntimeStatus_->setDead();
  initializer_->invalidate();
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
      makeNativeMethod("installTurboModuleCpp", WorkletsModule::installTurboModuleCpp),
      makeNativeMethod("invalidateCpp", WorkletsModule::invalidateCpp),
      makeNativeMethod("startCpp", WorkletsModule::startCpp),
  });
}

} // namespace worklets
