#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/RunLoop/AsyncQueueImpl.h>
#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>
#include <worklets/WorkletRuntime/RuntimeData.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

#include <react/debug/react_native_assert.h>

#include <memory>
#include <stdexcept>

using namespace facebook;

namespace worklets {

bool isDevBundleFromRNRuntime(jsi::Runtime &rnRuntime) {
  const auto rtDev = rnRuntime.global().getProperty(rnRuntime, "__DEV__");
  return rtDev.isBool() && rtDev.asBool();
}

void WorkletsModuleProxy::start() {
  react_native_assert(jsScheduler_->canInvokeSyncOnJS() && "start must be called on the JS thread");
  if (!rnRuntimeProxy_) [[unlikely]] {
    throw std::runtime_error("[Worklets] WorkletsModuleProxy must be attached to the RN runtime before start.");
  }
  if (uiRuntimeStarted_) {
    return;
  }

  startUIRuntime(JSIWorkletsModuleProxy::createForNewRuntime(rnRuntimeProxy_, RuntimeData::uiRuntimeId));
}

WorkletsModuleProxy::WorkletsModuleProxy(
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    const std::shared_ptr<RuntimeBindings> &runtimeBindings,
    const std::shared_ptr<RNRuntimeStatus> &rnRuntimeStatus)
    : isDevBundle_(false),
      jsScheduler_(jsScheduler),
      uiScheduler_(uiScheduler),
      jsLogger_(std::make_shared<JSLogger>(jsScheduler_)),
      runtimeBindings_(runtimeBindings),
      bundleModeConfig_{.enabled = false},
      memoryManager_(std::make_shared<MemoryManager>()),
      runtimeManager_(std::make_shared<RuntimeManager>()),
      unpackerLoader_(std::make_shared<UnpackerLoader>()),
      rnRuntimeStatus_(rnRuntimeStatus),
      uiWorkletRuntime_(runtimeManager_->createUninitializedUIRuntime(std::make_shared<AsyncQueueUI>(uiScheduler_))),
      uiRuntimeStarted_(false) {}

void WorkletsModuleProxy::startUIRuntimeInBundleMode(const BundleModeConfig &bundleModeConfig) {
  if (!bundleModeConfig.enabled) [[unlikely]] {
    throw std::runtime_error("[Worklets] startUIRuntimeInBundleMode requires Bundle Mode.");
  }
  if (rnRuntimeProxy_) [[unlikely]] {
    throw std::runtime_error("[Worklets] startUIRuntimeInBundleMode must be called before attachToRNRuntime.");
  }
  if (uiRuntimeStarted_) [[unlikely]] {
    throw std::runtime_error("[Worklets] The UI Worklet Runtime was already started.");
  }

  bundleModeConfig_ = bundleModeConfig;
  startUIRuntime(std::make_shared<JSIWorkletsModuleProxy>(
      false, /* isDevBundle_ */
      jsScheduler_,
      uiScheduler_,
      memoryManager_,
      runtimeManager_,
      uiWorkletRuntime_,
      runtimeBindings_,
      bundleModeConfig_,
      unpackerLoader_,
      rnRuntimeStatus_,
      RuntimeData::uiRuntimeId));
}

void WorkletsModuleProxy::attachToRNRuntime(
    jsi::Runtime &rnRuntime,
    const std::optional<BundleModeConfig> &bundleModeConfig) {
  react_native_assert(jsScheduler_->canInvokeSyncOnJS() && "attachToRNRuntime must be called on the JS thread");
  if (rnRuntimeProxy_) [[unlikely]] {
    throw std::runtime_error("[Worklets] WorkletsModuleProxy is already attached to the RN runtime.");
  }
  if (uiRuntimeStarted_ && bundleModeConfig.has_value()) [[unlikely]] {
    throw std::runtime_error("[Worklets] The Bundle Mode config was already set by startUIRuntimeInBundleMode.");
  }
  if (!uiRuntimeStarted_ && !bundleModeConfig.has_value()) [[unlikely]] {
    throw std::runtime_error(
        "[Worklets] attachToRNRuntime requires a Bundle Mode config unless startUIRuntimeInBundleMode was called.");
  }

  isDevBundle_ = isDevBundleFromRNRuntime(rnRuntime);
  if (bundleModeConfig.has_value()) {
    bundleModeConfig_ = *bundleModeConfig;
  }
  rnRuntimeProxy_ = std::make_shared<JSIWorkletsModuleProxy>(
      isDevBundle_,
      jsScheduler_,
      uiScheduler_,
      memoryManager_,
      runtimeManager_,
      uiWorkletRuntime_,
      runtimeBindings_,
      bundleModeConfig_,
      unpackerLoader_,
      rnRuntimeStatus_,
      RuntimeData::rnRuntimeId);
  RNRuntimeWorkletDecorator::decorate(rnRuntime, rnRuntimeProxy_->toOptimizedObject(rnRuntime), jsLogger_);
}

WorkletsModuleProxy::~WorkletsModuleProxy() {
  animationFrameBatchinator_.reset();
  uiWorkletRuntime_.reset();
}

void WorkletsModuleProxy::startUIRuntime(const std::shared_ptr<JSIWorkletsModuleProxy> &uiRuntimeProxy) {
  uiWorkletRuntime_->init(uiRuntimeProxy);

  animationFrameBatchinator_ =
      std::make_shared<AnimationFrameBatchinator>(uiWorkletRuntime_, runtimeBindings_->requestAnimationFrame);

  UIRuntimeDecorator::decorate(
      uiWorkletRuntime_->getJSIRuntime(), animationFrameBatchinator_->getJsiRequestAnimationFrame());

  uiRuntimeStarted_ = true;
}

} // namespace worklets
