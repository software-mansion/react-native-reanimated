#pragma once

#include <jsi/jsi.h>
#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/RNRuntimeStatus.h>
#include <worklets/Tools/UIScheduler.h>
#include <worklets/WorkletRuntime/BundleModeConfig.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>

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

  void beginBundleModeAOT();

  void prepareBundleModeAOT(const BundleModeConfigLoader &loadBundleModeConfig);

  std::shared_ptr<WorkletsModuleProxy> finalize(
      jsi::Runtime &rnRuntime,
      const BundleModeConfigLoader &loadBundleModeConfig);

  void invalidate();

 private:
  enum class Stage { Created, AOTBegun, Finalized, Invalidated };

  using ProxyPromise = std::promise<std::shared_ptr<WorkletsModuleProxy>>;
  using ProxyFuture = std::shared_future<std::shared_ptr<WorkletsModuleProxy>>;

  const std::shared_ptr<JSScheduler> jsScheduler_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
  const std::shared_ptr<RuntimeBindings> runtimeBindings_;
  const std::shared_ptr<RNRuntimeStatus> rnRuntimeStatus_;

  std::mutex mutex_;
  Stage stage_{Stage::Created};
  ProxyPromise preparedProxyPromise_;
  ProxyFuture preparedProxy_;
  ProxyPromise aotProxyPromise_;
  ProxyFuture aotProxy_;
};

} // namespace worklets
