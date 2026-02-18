#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>

#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/RunLoop/AsyncQueueImpl.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/Tools/Defs.h>
#include <worklets/Tools/ScriptBuffer.h>
#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
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

bool isDevBundleFromRNRuntime(jsi::Runtime &rnRuntime) {
  const auto rtDev = rnRuntime.global().getProperty(rnRuntime, "__DEV__");
  return rtDev.isBool() && rtDev.asBool();
}

/**
* This method is required outside of Bundle Mode to make sure we start creating
* Worklet Runtimes only after unpackers code was loaded from the RN Runtime.
*
* In Bundle Mode unpackers are installed during bundle evaluation instead.
 */
void WorkletsModuleProxy::start() {
  /**
   * We call additional `init` method here because
   * JSIWorkletsModuleProxy needs a weak_ptr to the UI Runtime.
   */
  uiWorkletRuntime_->init(createJSIWorkletsModuleProxy());

  animationFrameBatchinator_ =
      std::make_shared<AnimationFrameBatchinator>(uiWorkletRuntime_, runtimeBindings_->requestAnimationFrame);

  UIRuntimeDecorator::decorate(
      uiWorkletRuntime_->getJSIRuntime(), animationFrameBatchinator_->getJsiRequestAnimationFrame());
}

WorkletsModuleProxy::WorkletsModuleProxy(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<CallInvoker> &jsCallInvoker,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    std::function<bool()> &&isJavaScriptThread,
    const std::shared_ptr<RuntimeBindings> &runtimeBindings,
    const std::shared_ptr<const ScriptBuffer> &script,
    const std::string &sourceUrl)
    : isDevBundle_(isDevBundleFromRNRuntime(rnRuntime)),
      jsQueue_(jsQueue),
      jsScheduler_(std::make_shared<JSScheduler>(rnRuntime, jsCallInvoker, std::move(isJavaScriptThread))),
      uiScheduler_(uiScheduler),
      jsLogger_(std::make_shared<JSLogger>(jsScheduler_)),
      runtimeBindings_(runtimeBindings),
      script_(script),
      sourceUrl_(sourceUrl),
      memoryManager_(std::make_shared<MemoryManager>()),
      runtimeManager_(std::make_shared<RuntimeManager>()),
      unpackerLoader_(std::make_shared<UnpackerLoader>()),
      uiWorkletRuntime_(
          runtimeManager_->createUninitializedUIRuntime(jsQueue_, std::make_shared<AsyncQueueUI>(uiScheduler_))),
          rnRuntimeProxy_(std::make_shared<JSIWorkletsModuleProxy>(
                  isDevBundle_,
                  script_,
                  sourceUrl_,
                  jsQueue_,
                  jsScheduler_,
                  uiScheduler_,
                  memoryManager_,
                  runtimeManager_,
                  uiWorkletRuntime_,
                  runtimeBindings_,
                  unpackerLoader_)
){
  auto optimizedJsiWorkletsModuleProxy = jsi_utils::optimizedFromHostObject(
      rnRuntime, std::static_pointer_cast<jsi::HostObject>(rnRuntimeProxy_));
  RNRuntimeWorkletDecorator::decorate(rnRuntime, std::move(optimizedJsiWorkletsModuleProxy), jsLogger_);
}

std::shared_ptr<JSIWorkletsModuleProxy> WorkletsModuleProxy::createJSIWorkletsModuleProxy() const {
      return std::make_shared<JSIWorkletsModuleProxy>(*rnRuntimeProxy_);
}

WorkletsModuleProxy::~WorkletsModuleProxy() {
  animationFrameBatchinator_.reset();
  jsQueue_->quitSynchronous();
  uiWorkletRuntime_.reset();
}

} // namespace worklets
