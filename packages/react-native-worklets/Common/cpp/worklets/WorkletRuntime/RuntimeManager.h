#pragma once

#include <jsi/jsi.h>
#include <worklets/Tools/UIScheduler.h>
#include <worklets/WorkletRuntime/RuntimeData.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <atomic>
#include <cstdint>
#include <map>
#include <memory>
#include <shared_mutex>
#include <string>
#include <vector>

namespace worklets {

/**
 * Forward declaration to avoid circular dependencies.
 */
class JSIWorkletsModuleProxy;

class RuntimeManager {
 public:
  std::shared_ptr<WorkletRuntime> getRuntime(uint64_t runtimeId);

  std::vector<std::shared_ptr<WorkletRuntime>> getAllRuntimes();

  std::shared_ptr<WorkletRuntime> getUIRuntime();

  std::shared_ptr<WorkletRuntime> createWorkletRuntime(
      std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy,
      const std::string &name,
      const std::shared_ptr<SerializableWorklet> &initializer = nullptr,
      const std::shared_ptr<AsyncQueue> &queue = nullptr,
      bool enableEventLoop = true);

  std::shared_ptr<WorkletRuntime> createUninitializedUIRuntime(
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::shared_ptr<AsyncQueue> &uiAsyncQueue);

  /** Pauses registration of new Worklet Runtimes. */
  void pause();

  /** Resumes registration of new Worklet Runtimes. */
  void resume();

 private:
  uint64_t getNextRuntimeId();

  void registerRuntime(const uint64_t runtimeId, const std::shared_ptr<WorkletRuntime> &workletRuntime);

  std::atomic_uint64_t nextRuntimeId_{RuntimeData::uiRuntimeId + 1};
  std::map<uint64_t, std::weak_ptr<WorkletRuntime>> weakRuntimes_;
  std::shared_mutex weakRuntimesMutex_;
  std::mutex registrationMutex_;
};

} // namespace worklets
