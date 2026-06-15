#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/RunLoop/AsyncQueueImpl.h>
#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>
#include <worklets/WorkletRuntime/RuntimeData.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

#include <memory>
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
  const auto uiRuntimeProxy = JSIWorkletsModuleProxy::createForNewRuntime(rnRuntimeProxy_, RuntimeData::uiRuntimeId);
  uiWorkletRuntime_->init(uiRuntimeProxy);

  animationFrameBatchinator_ =
      std::make_shared<AnimationFrameBatchinator>(uiWorkletRuntime_, runtimeBindings_->requestAnimationFrame);

  UIRuntimeDecorator::decorate(
      uiWorkletRuntime_->getJSIRuntime(), animationFrameBatchinator_->getJsiRequestAnimationFrame());
}

WorkletsModuleProxy::WorkletsModuleProxy(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<CallInvoker> &jsCallInvoker,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    std::function<bool()> &&isJavaScriptThread,
    const std::shared_ptr<RuntimeBindings> &runtimeBindings,
    const BundleModeConfig &bundleModeConfig)
    : isDevBundle_(isDevBundleFromRNRuntime(rnRuntime)),
      jsScheduler_(std::make_shared<JSScheduler>(rnRuntime, jsCallInvoker, std::move(isJavaScriptThread))),
      uiScheduler_(uiScheduler),
      jsLogger_(std::make_shared<JSLogger>(jsScheduler_)),
      runtimeBindings_(runtimeBindings),
      bundleModeConfig_(bundleModeConfig),
      memoryManager_(std::make_shared<MemoryManager>()),
      runtimeManager_(std::make_shared<RuntimeManager>()),
      unpackerLoader_(std::make_shared<UnpackerLoader>()),
      uiWorkletRuntime_(runtimeManager_->createUninitializedUIRuntime(std::make_shared<AsyncQueueUI>(uiScheduler_))),
      rnRuntimeProxy_(std::make_shared<JSIWorkletsModuleProxy>(
          isDevBundle_,
          jsScheduler_,
          uiScheduler_,
          memoryManager_,
          runtimeManager_,
          uiWorkletRuntime_,
          runtimeBindings_,
          bundleModeConfig_,
          unpackerLoader_,
          RuntimeData::rnRuntimeId)) {
  RNRuntimeWorkletDecorator::decorate(rnRuntime, rnRuntimeProxy_->toOptimizedObject(rnRuntime), jsLogger_);
}

WorkletsModuleProxy::~WorkletsModuleProxy() {
  animationFrameBatchinator_.reset();
  uiWorkletRuntime_.reset();
}

} // namespace worklets
