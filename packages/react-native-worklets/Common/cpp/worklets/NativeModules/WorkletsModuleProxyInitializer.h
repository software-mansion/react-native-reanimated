#pragma once

#include <jsi/jsi.h>
#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/RNRuntimeStatus.h>
#include <worklets/Tools/UIScheduler.h>
#include <worklets/WorkletRuntime/BundleModeConfig.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>

#include <atomic>
#include <functional>
#include <future>
#include <memory>
#include <mutex>

namespace worklets {

class WorkletsModuleProxyInitializer {
 public:
  using BundleModeConfigLoader = std::function<BundleModeConfig()>;

  WorkletsModuleProxyInitializer(
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const std::shared_ptr<UIScheduler> &uiScheduler,
      const std::shared_ptr<RuntimeBindings> &runtimeBindings,
      const std::shared_ptr<RNRuntimeStatus> &rnRuntimeStatus);

  void prepareProxy();

  void beginBundleMode();

  void prepareBundleMode(const BundleModeConfigLoader &loadBundleModeConfig);

  std::shared_ptr<WorkletsModuleProxy>
  finalize(jsi::Runtime &rnRuntime, bool bundleModeEnabled, const BundleModeConfigLoader &loadBundleModeConfig);

  void invalidate();

 private:
  using ProxyPromise = std::shared_ptr<std::promise<std::shared_ptr<WorkletsModuleProxy>>>;
  using ProxyFuture = std::future<std::shared_ptr<WorkletsModuleProxy>>;

  const std::shared_ptr<JSScheduler> jsScheduler_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
  const std::shared_ptr<RuntimeBindings> runtimeBindings_;
  const std::shared_ptr<RNRuntimeStatus> rnRuntimeStatus_;

  std::atomic<bool> prepared_{false};
  std::mutex mutex_;
  const ProxyPromise preparedProxyPromise_;
  ProxyFuture preparedProxy_;
  ProxyPromise startedProxyPromise_;
  ProxyFuture startedProxy_;
};

} // namespace worklets
