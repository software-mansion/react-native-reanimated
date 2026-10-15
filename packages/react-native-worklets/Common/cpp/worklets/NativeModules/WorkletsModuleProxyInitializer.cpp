#include <worklets/NativeModules/WorkletsModuleProxyInitializer.h>

#include <react/debug/react_native_assert.h>

#include <exception>
#include <future>
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
      aotProxy_(aotProxyPromise_.get_future().share()) {}

void WorkletsModuleProxyInitializer::prepareProxy() {
  try {
    preparedProxyPromise_.set_value(
        std::make_shared<WorkletsModuleProxy>(jsScheduler_, uiScheduler_, runtimeBindings_, rnRuntimeStatus_));
  } catch (const std::future_error &) {
    throw std::runtime_error("[Worklets] prepareProxy must be called exactly once.");
  } catch (...) {
    preparedProxyPromise_.set_exception(std::current_exception());
  }
}

void WorkletsModuleProxyInitializer::beginBundleModeAOT() {
  react_native_assert(jsScheduler_->canInvokeSyncOnJS() && "beginBundleModeAOT must be called on the JS thread");
  std::lock_guard lock(mutex_);
  if (stage_ != Stage::Created) [[unlikely]] {
    throw std::runtime_error("[Worklets] beginBundleModeAOT must be called at most once and before finalize.");
  }
  stage_ = Stage::AOTBegun;
}

void WorkletsModuleProxyInitializer::prepareBundleModeAOT(const BundleModeConfigLoader &loadBundleModeConfig) {
  try {
    auto proxy = preparedProxy_.get();
    proxy->startUIRuntimeInBundleModeAOT(loadBundleModeConfig());
    aotProxyPromise_.set_value(std::move(proxy));
  } catch (const std::future_error &) {
    throw std::runtime_error("[Worklets] prepareBundleModeAOT must be called exactly once.");
  } catch (...) {
    aotProxyPromise_.set_exception(std::current_exception());
  }
}

std::shared_ptr<WorkletsModuleProxy> WorkletsModuleProxyInitializer::finalize(
    jsi::Runtime &rnRuntime,
    const bool bundleModeEnabled,
    const BundleModeConfigLoader &loadBundleModeConfig) {
  react_native_assert(jsScheduler_->canInvokeSyncOnJS() && "finalize must be called on the JS thread");
  bool startedAOT = false;
  {
    std::lock_guard lock(mutex_);
    if (stage_ == Stage::Finalized || stage_ == Stage::Invalidated) [[unlikely]] {
      throw std::runtime_error("[Worklets] finalize must be called at most once and before invalidate.");
    }
    startedAOT = stage_ == Stage::AOTBegun;
    stage_ = Stage::Finalized;
  }
  auto proxy = (startedAOT ? aotProxy_ : preparedProxy_).get();
  if (startedAOT) {
    proxy->attachToRNRuntime(rnRuntime, std::nullopt);
  } else {
    proxy->attachToRNRuntime(
        rnRuntime, bundleModeEnabled ? loadBundleModeConfig() : BundleModeConfig{.enabled = false});
  }
  return proxy;
}

void WorkletsModuleProxyInitializer::invalidate() {
  bool startedAOT = false;
  {
    std::lock_guard lock(mutex_);
    startedAOT = stage_ == Stage::AOTBegun;
    stage_ = Stage::Invalidated;
  }
  if (startedAOT) {
    aotProxy_.wait();
  }
  preparedProxy_.wait();
}

} // namespace worklets
