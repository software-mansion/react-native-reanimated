#include <worklets/NativeModules/WorkletsModuleProxyInitializer.h>

#include <react/debug/react_native_assert.h>

#include <exception>
#include <optional>
#include <stdexcept>
#include <utility>

namespace worklets {

WorkletsModuleProxyInitializer::WorkletsModuleProxyInitializer(
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    const std::shared_ptr<RuntimeBindings> &runtimeBindings,
    const std::shared_ptr<RNRuntimeStatus> &rnRuntimeStatus)
    : jsScheduler_(jsScheduler),
      uiScheduler_(uiScheduler),
      runtimeBindings_(runtimeBindings),
      rnRuntimeStatus_(rnRuntimeStatus),
      preparedProxy_(preparedProxyPromise_.get_future().share()),
      startedProxy_(startedProxyPromise_.get_future().share()) {}

void WorkletsModuleProxyInitializer::prepareProxy() {
  try {
    preparedProxyPromise_.set_value(
        std::make_shared<WorkletsModuleProxy>(jsScheduler_, uiScheduler_, runtimeBindings_, rnRuntimeStatus_));
  } catch (...) {
    preparedProxyPromise_.set_exception(std::current_exception());
  }
}

void WorkletsModuleProxyInitializer::beginBundleMode() {
  react_native_assert(jsScheduler_->canInvokeSyncOnJS() && "beginBundleMode must be called on the JS thread");
  std::lock_guard lock(mutex_);
  if (stage_ != Stage::Created) [[unlikely]] {
    throw std::runtime_error("[Worklets] beginBundleMode must be called at most once and before finalize.");
  }
  stage_ = Stage::BundleModeBegun;
}

void WorkletsModuleProxyInitializer::prepareBundleMode(const BundleModeConfigLoader &loadBundleModeConfig) {
  try {
    auto proxy = preparedProxy_.get();
    proxy->startUIRuntimeInBundleMode(loadBundleModeConfig());
    startedProxyPromise_.set_value(std::move(proxy));
  } catch (...) {
    startedProxyPromise_.set_exception(std::current_exception());
  }
}

std::shared_ptr<WorkletsModuleProxy> WorkletsModuleProxyInitializer::finalize(
    jsi::Runtime &rnRuntime,
    const bool bundleModeEnabled,
    const BundleModeConfigLoader &loadBundleModeConfig) {
  react_native_assert(jsScheduler_->canInvokeSyncOnJS() && "finalize must be called on the JS thread");
  bool startedAheadOfTime = false;
  {
    std::lock_guard lock(mutex_);
    if (stage_ == Stage::Finalized || stage_ == Stage::Invalidated) [[unlikely]] {
      throw std::runtime_error("[Worklets] finalize must be called at most once and before invalidate.");
    }
    startedAheadOfTime = stage_ == Stage::BundleModeBegun;
    stage_ = Stage::Finalized;
  }
  auto proxy = (startedAheadOfTime ? startedProxy_ : preparedProxy_).get();
  if (startedAheadOfTime) {
    proxy->attachToRNRuntime(rnRuntime, std::nullopt);
  } else {
    proxy->attachToRNRuntime(
        rnRuntime, bundleModeEnabled ? loadBundleModeConfig() : BundleModeConfig{.enabled = false});
  }
  return proxy;
}

void WorkletsModuleProxyInitializer::invalidate() {
  bool startedAheadOfTime = false;
  {
    std::lock_guard lock(mutex_);
    startedAheadOfTime = stage_ == Stage::BundleModeBegun;
    stage_ = Stage::Invalidated;
  }
  if (startedAheadOfTime) {
    startedProxy_.wait();
  }
  preparedProxy_.wait();
}

} // namespace worklets
