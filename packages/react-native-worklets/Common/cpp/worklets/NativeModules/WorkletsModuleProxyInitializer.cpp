#include <worklets/NativeModules/WorkletsModuleProxyInitializer.h>

#include <react/debug/react_native_assert.h>

#include <exception>
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
      preparedProxyPromise_(std::make_shared<std::promise<std::shared_ptr<WorkletsModuleProxy>>>()),
      preparedProxy_(preparedProxyPromise_->get_future()) {}

void WorkletsModuleProxyInitializer::prepareProxy() {
  if (prepared_.exchange(true)) {
    throw std::runtime_error("[Worklets] prepareProxy must be called exactly once.");
  }
  try {
    preparedProxyPromise_->set_value(
        std::make_shared<WorkletsModuleProxy>(jsScheduler_, uiScheduler_, runtimeBindings_, rnRuntimeStatus_));
  } catch (...) {
    preparedProxyPromise_->set_exception(std::current_exception());
  }
}

void WorkletsModuleProxyInitializer::beginBundleMode() {
  react_native_assert(jsScheduler_->canInvokeSyncOnJS() && "beginBundleMode must be called on the JS thread");
  std::lock_guard lock(mutex_);
  if (startedProxy_.valid()) [[unlikely]] {
    throw std::runtime_error("[Worklets] beginBundleMode must be called at most once.");
  }
  if (!preparedProxy_.valid()) [[unlikely]] {
    throw std::runtime_error("[Worklets] beginBundleMode must be called before finalize.");
  }
  startedProxyPromise_ = std::make_shared<std::promise<std::shared_ptr<WorkletsModuleProxy>>>();
  startedProxy_ = startedProxyPromise_->get_future();
}

void WorkletsModuleProxyInitializer::prepareBundleMode(const BundleModeConfigLoader &loadBundleModeConfig) {
  ProxyPromise startedProxyPromise;
  ProxyFuture preparedProxy;
  {
    std::lock_guard lock(mutex_);
    startedProxyPromise = std::move(startedProxyPromise_);
    preparedProxy = std::move(preparedProxy_);
  }
  if (!startedProxyPromise) [[unlikely]] {
    throw std::runtime_error("[Worklets] prepareBundleMode must be called exactly once after beginBundleMode.");
  }
  try {
    if (!preparedProxy.valid()) [[unlikely]] {
      throw std::runtime_error("[Worklets] prepareBundleMode was called after the prepared proxy was already taken.");
    }
    auto proxy = preparedProxy.get();
    proxy->startUIRuntimeInBundleMode(loadBundleModeConfig());
    startedProxyPromise->set_value(std::move(proxy));
  } catch (...) {
    startedProxyPromise->set_exception(std::current_exception());
  }
}

std::shared_ptr<WorkletsModuleProxy> WorkletsModuleProxyInitializer::finalize(
    jsi::Runtime &rnRuntime,
    const bool bundleModeEnabled,
    const BundleModeConfigLoader &loadBundleModeConfig) {
  react_native_assert(jsScheduler_->canInvokeSyncOnJS() && "finalize must be called on the JS thread");
  bool startedAheadOfTime = false;
  ProxyFuture proxyFuture;
  {
    std::lock_guard lock(mutex_);
    startedAheadOfTime = startedProxy_.valid();
    proxyFuture = std::move(startedAheadOfTime ? startedProxy_ : preparedProxy_);
  }
  if (!proxyFuture.valid()) [[unlikely]] {
    throw std::runtime_error("[Worklets] finalize was called after the prepared proxy was already taken.");
  }
  if (startedAheadOfTime && !bundleModeEnabled) [[unlikely]] {
    throw std::runtime_error(
        "[Worklets] prepareBundleMode was called, but installTurboModule was called with Bundle Mode disabled.");
  }
  auto proxy = proxyFuture.get();
  if (startedAheadOfTime) {
    proxy->attachToRNRuntime(rnRuntime, std::nullopt);
  } else {
    proxy->attachToRNRuntime(
        rnRuntime, bundleModeEnabled ? loadBundleModeConfig() : BundleModeConfig{.enabled = false});
  }
  return proxy;
}

void WorkletsModuleProxyInitializer::invalidate() {
  ProxyFuture startedProxy;
  ProxyFuture preparedProxy;
  {
    std::lock_guard lock(mutex_);
    startedProxy = std::move(startedProxy_);
    preparedProxy = std::move(preparedProxy_);
  }
  if (startedProxy.valid()) {
    startedProxy.wait();
  }
  if (preparedProxy.valid()) {
    preparedProxy.wait();
  }
}

} // namespace worklets
