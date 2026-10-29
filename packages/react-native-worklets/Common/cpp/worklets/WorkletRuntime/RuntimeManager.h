#pragma once

#include <jsi/jsi.h>
#include <worklets/Tools/UIScheduler.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <atomic>
#include <concepts>
#include <cstdint>
#include <map>
#include <memory>
#include <mutex>
#include <shared_mutex>
#include <string>
#include <utility>
#include <vector>

namespace worklets {

/**
 * Forward declaration to avoid circular dependencies.
 */
class JSIWorkletsModuleProxy;
class WorkletRuntime;
class SerializableWorklet;
class AsyncQueue;

class RuntimeManager : public std::enable_shared_from_this<RuntimeManager> {
 public:
  std::shared_ptr<WorkletRuntime> getRuntime(uint64_t runtimeId);

  std::vector<std::shared_ptr<WorkletRuntime>> getAllRuntimes();

  std::shared_ptr<WorkletRuntime> getUIRuntime();

  std::shared_ptr<WorkletRuntime> createWorkletRuntime(
      const std::shared_ptr<const JSIWorkletsModuleProxy> &sourceProxy,
      const std::string &name,
      const std::shared_ptr<SerializableWorklet> &initializer = nullptr,
      const std::shared_ptr<AsyncQueue> &queue = nullptr,
      bool enableEventLoop = true,
      bool enableLocking = true,
      bool enableNetworking = true);

  std::shared_ptr<WorkletRuntime> createUninitializedUIRuntime(const std::shared_ptr<AsyncQueue> &uiAsyncQueue);

#ifndef NDEBUG
  void propagateModuleUpdate(const std::string &code, const std::string &sourceUrl);
#endif // NDEBUG

  template <std::invocable<> Fn>
  decltype(auto) withRegistrationPaused(Fn &&fn) {
    std::unique_lock lock(registrationMutex_);
    return std::forward<Fn>(fn)();
  }

  template <std::invocable<bool> TFn>
  void runWhileRuntimeLocked(RuntimeData::RuntimeId runtimeId, TFn &&fn) {
    std::shared_lock lock(weakRuntimesMutex_);
    std::forward<TFn>(fn)(weakRuntimes_.contains(runtimeId));
  }

 private:
  friend class WorkletHermesRuntime;

  void onRuntimeCreated(RuntimeData::RuntimeId runtimeId);

  void onRuntimeDestroyed(RuntimeData::RuntimeId runtimeId);

  uint64_t getNextRuntimeId();

  void registerRuntime(const uint64_t runtimeId, const std::shared_ptr<WorkletRuntime> &workletRuntime);

#ifndef NDEBUG
  void loadModuleUpdates(const std::shared_ptr<WorkletRuntime> &workletRuntime);

  struct ModuleUpdate {
    std::string sourceUrl;
    std::string code;
  };
#endif // NDEBUG

  std::atomic_uint64_t nextRuntimeId_{RuntimeData::uiRuntimeId + 1};
  std::map<uint64_t, std::weak_ptr<WorkletRuntime>> weakRuntimes_;
  std::shared_mutex weakRuntimesMutex_;
  std::mutex registrationMutex_;
#ifndef NDEBUG
  std::vector<ModuleUpdate> moduleUpdates_;
#endif // NDEBUG
};

} // namespace worklets
