#pragma once

#include <jsi/jsi.h>
#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/RNRuntimeStatus.h>
#include <worklets/Tools/UIScheduler.h>
#include <worklets/WorkletRuntime/BundleModeConfig.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>

#include <atomic>
#include <future>
#include <memory>
#include <mutex>

namespace worklets {

class WorkletsModuleProxyInitializer {
 public:
  WorkletsModuleProxyInitializer(
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const std::shared_ptr<UIScheduler> &uiScheduler,
      const std::shared_ptr<RuntimeBindings> &runtimeBindings,
      const std::shared_ptr<RNRuntimeStatus> &rnRuntimeStatus);

  void prepareProxy();

  std::shared_ptr<WorkletsModuleProxy> finalize(jsi::Runtime &rnRuntime, const BundleModeConfig &bundleModeConfig);

  void invalidate();

 private:
  using ProxyFuture = std::future<std::shared_ptr<WorkletsModuleProxy>>;

  const std::shared_ptr<JSScheduler> jsScheduler_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
  const std::shared_ptr<RuntimeBindings> runtimeBindings_;
  const std::shared_ptr<RNRuntimeStatus> rnRuntimeStatus_;

  std::atomic<bool> prepared_{false};
  std::mutex mutex_;
  const std::shared_ptr<std::promise<std::shared_ptr<WorkletsModuleProxy>>> preparedProxyPromise_;
  ProxyFuture preparedProxy_;
};

} // namespace worklets
