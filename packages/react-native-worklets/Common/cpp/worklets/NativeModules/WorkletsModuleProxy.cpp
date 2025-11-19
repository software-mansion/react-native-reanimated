#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>

#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/RunLoop/AsyncQueueImpl.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/Tools/Defs.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif // __ANDROID__

#include <memory>
#include <string>
#include <utility>

using namespace facebook;

namespace worklets {

auto isDevBundleFromRNRuntime(jsi::Runtime &rnRuntime) -> bool;

WorkletsModuleProxy::WorkletsModuleProxy(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<CallInvoker> &jsCallInvoker,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    std::function<bool()> &&isJavaScriptThread,
    RuntimeBindings runtimeBindings,
    const std::shared_ptr<const JSBigStringBuffer> &script,
    const std::string &sourceUrl)
    : isDevBundle_(isDevBundleFromRNRuntime(rnRuntime)),
      jsQueue_(jsQueue),
      jsScheduler_(std::make_shared<JSScheduler>(rnRuntime, jsCallInvoker, std::move(isJavaScriptThread))),
      uiScheduler_(uiScheduler),
      jsLogger_(std::make_shared<JSLogger>(jsScheduler_)),
      runtimeBindings_(std::move(runtimeBindings)),
      script_(script),
      sourceUrl_(sourceUrl),
      memoryManager_(std::make_shared<MemoryManager>()),
      runtimeManager_(std::make_shared<RuntimeManager>()),
      uiWorkletRuntime_(
          runtimeManager_->createUninitializedUIRuntime(jsQueue_, std::make_shared<AsyncQueueUI>(uiScheduler_))) {
  /**
   * We call additional `init` method here because
   * JSIWorkletsModuleProxy needs a weak_ptr to the UI Runtime.
   */
  uiWorkletRuntime_->init(createJSIWorkletsModuleProxy());

  animationFrameBatchinator_ =
      std::make_shared<AnimationFrameBatchinator>(uiWorkletRuntime_, runtimeBindings_.requestAnimationFrame);

  UIRuntimeDecorator::decorate(
      uiWorkletRuntime_->getJSIRuntime(), animationFrameBatchinator_->getJsiRequestAnimationFrame());
}

std::shared_ptr<JSIWorkletsModuleProxy> WorkletsModuleProxy::createJSIWorkletsModuleProxy() const {
  assert(uiWorkletRuntime_ && "UI Worklet Runtime must be initialized before creating JSI proxy.");
  return std::make_shared<JSIWorkletsModuleProxy>(
      isDevBundle_,
      script_,
      sourceUrl_,
      jsQueue_,
      jsScheduler_,
      uiScheduler_,
      memoryManager_,
      runtimeManager_,
      uiWorkletRuntime_);
}

WorkletsModuleProxy::~WorkletsModuleProxy() {
  animationFrameBatchinator_.reset();
  jsQueue_->quitSynchronous();
  uiWorkletRuntime_.reset();
}

auto isDevBundleFromRNRuntime(jsi::Runtime &rnRuntime) -> bool {
  const auto rtDev = rnRuntime.global().getProperty(rnRuntime, "__DEV__");
  return rtDev.isBool() && rtDev.asBool();
}

} // namespace worklets
