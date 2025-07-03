#pragma once

#include <jsi/jsi.h>
#include <worklets/Tools/UIScheduler.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <atomic>
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

/**
 * Unused, but kept for possible future use.
 */
static constexpr uint64_t rnRuntimeId{0};
static constexpr uint64_t uiRuntimeId{1};
static constexpr std::string uiRuntimeName{"UI"};

class RuntimeManager {
 public:
  auto getRuntime(uint64_t runtimeId) -> std::shared_ptr<WorkletRuntime>;
  auto getRuntime(const std::string &name) -> std::shared_ptr<WorkletRuntime>;

  auto getAllRuntimes() -> std::vector<std::shared_ptr<WorkletRuntime>>;

  auto getUIRuntime() -> std::shared_ptr<WorkletRuntime>;

  auto createWorkletRuntime(
      std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy,
      const bool supportsLocking,
      const std::string &name,
      const jsi::Value &initializer = jsi::Value::undefined())
      -> std::shared_ptr<WorkletRuntime>;

  auto createUninitializedUIRuntime(
      const std::shared_ptr<MessageQueueThread> &jsQueue)
      -> std::shared_ptr<WorkletRuntime>;

 private:
  auto getNextRuntimeId() -> uint64_t {
    return nextRuntimeId_.fetch_add(1, std::memory_order_relaxed);
  }

  std::atomic_uint64_t nextRuntimeId_{uiRuntimeId + 1};
  std::map<uint64_t, std::weak_ptr<WorkletRuntime>> weakRuntimes_;
  std::shared_mutex weakRuntimesMutex_;
  std::map<std::string, uint64_t> nameToRuntimeId_;
};

} // namespace worklets
