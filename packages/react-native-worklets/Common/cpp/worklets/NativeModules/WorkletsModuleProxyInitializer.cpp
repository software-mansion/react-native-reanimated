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

std::shared_ptr<WorkletsModuleProxy> WorkletsModuleProxyInitializer::finalize(
    jsi::Runtime &rnRuntime,
    const BundleModeConfig &bundleModeConfig) {
  react_native_assert(jsScheduler_->canInvokeSyncOnJS() && "finalize must be called on the JS thread");
  ProxyFuture preparedProxy;
  {
    std::lock_guard lock(mutex_);
    preparedProxy = std::move(preparedProxy_);
  }
  if (!preparedProxy.valid()) {
    throw std::runtime_error("[Worklets] finalize was called after the prepared proxy was already taken.");
  }
  auto proxy = preparedProxy.get();
  proxy->attachToRNRuntime(rnRuntime, bundleModeConfig);
  return proxy;
}

void WorkletsModuleProxyInitializer::invalidate() {
  ProxyFuture preparedProxy;
  {
    std::lock_guard lock(mutex_);
    preparedProxy = std::move(preparedProxy_);
  }
  if (preparedProxy.valid()) {
    preparedProxy.wait();
  }
}

} // namespace worklets
