#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/Tools/ScriptBuffer.h>
#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>
#include <worklets/android/AnimationFrameCallback.h>
#include <worklets/android/WorkletsModule.h>

#if defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
#include <folly/json/dynamic.h>
#include <jni.h>
#include <jsi/JSIDynamic.h>
#include <react/jni/JCallback.h>
#include <react/jni/ReadableNativeArray.h>
#include <react/jni/ReadableNativeMap.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>
#include <worklets/android/JWorkletRuntimeWrapper.h>
#endif // defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)

#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace worklets {

using namespace facebook;
using namespace react;

WorkletsModule::WorkletsModule(
    jni::alias_ref<jhybridobject> jThis, // NOLINT //(performance-unnecessary-value-param)
    jsi::Runtime *rnRuntime,
    jni::alias_ref<JavaMessageQueueThread::javaobject>
        messageQueueThread, // NOLINT //(performance-unnecessary-value-param)
    const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    const std::shared_ptr<const ScriptBuffer> &script,
    const std::string &sourceURL)
    : javaPart_(jni::make_global(jThis)),
      rnRuntime_(rnRuntime),
      workletsModuleProxy_(std::make_shared<WorkletsModuleProxy>(
          *rnRuntime,
          std::make_shared<JMessageQueueThread>(messageQueueThread),
          jsCallInvoker,
          uiScheduler,
          getIsOnJSQueueThread(),
          std::make_shared<RuntimeBindings>(RuntimeBindings{
              .requestAnimationFrame = getRequestAnimationFrame()
#if defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
                  ,
              .abortRequest = getAbortRequest(),
              .clearCookies = getClearCookies(),
              .sendRequest = getSendRequest()
#endif // defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
          }),
          script,
          sourceURL)) {
}

jni::local_ref<WorkletsModule::jhybriddata> WorkletsModule::initHybrid(
    jni::alias_ref<jhybridobject> jThis, // NOLINT //(performance-unnecessary-value-param)
    jlong jsContext,
    jni::alias_ref<JavaMessageQueueThread::javaobject>
        messageQueueThread, // NOLINT //(performance-unnecessary-value-param)
    jni::alias_ref<facebook::react::CallInvokerHolder::javaobject> jsCallInvokerHolder,
    jni::alias_ref<worklets::AndroidUIScheduler::javaobject> androidUIScheduler,
    jni::alias_ref<JScriptBufferWrapper::javaobject>
        jScriptBufferWrapper // NOLINT //(performance-unnecessary-value-param)
) {
  auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
  auto rnRuntime = reinterpret_cast<jsi::Runtime *>(jsContext); // NOLINT //(performance-no-int-to-ptr)
  auto uiScheduler = androidUIScheduler->cthis()->getUIScheduler();

  std::shared_ptr<const ScriptBuffer> script = nullptr;
  std::string sourceURL;
#ifdef WORKLETS_BUNDLE_MODE_ENABLED
  auto cxxWrapper = jScriptBufferWrapper->cthis();
  script = cxxWrapper->getScript();
  sourceURL = cxxWrapper->getSourceUrl();
#endif // WORKLETS_BUNDLE_MODE_ENABLED

  return makeCxxInstance(jThis, rnRuntime, messageQueueThread, jsCallInvoker, uiScheduler, script, sourceURL);
}

RuntimeBindings::RequestAnimationFrame WorkletsModule::getRequestAnimationFrame() {
  return [javaPart = javaPart_](std::function<void(const double)> &&callback) -> void {
    static const auto jRequestAnimationFrame =
        javaPart->getClass()->getMethod<void(AnimationFrameCallback::javaobject)>("requestAnimationFrame");
    jRequestAnimationFrame(javaPart.get(), AnimationFrameCallback::newObjectCxxArgs(std::move(callback)).get());
  };
}

#if defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
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
#endif // defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)

std::function<bool()> WorkletsModule::getIsOnJSQueueThread() {
  return [javaPart = javaPart_]() -> bool {
    return javaPart->getClass()->getMethod<jboolean()>("isOnJSQueueThread").operator()(javaPart);
  };
}

void WorkletsModule::invalidateCpp() {
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
