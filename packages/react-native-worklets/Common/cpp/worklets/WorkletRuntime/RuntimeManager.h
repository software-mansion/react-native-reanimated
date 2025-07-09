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
constexpr uint64_t rnRuntimeId{0};
constexpr uint64_t uiRuntimeId{1};
extern const std::string uiRuntimeName;

class RuntimeManager {
 public:
  std::shared_ptr<WorkletRuntime> getRuntime(uint64_t runtimeId);
  std::shared_ptr<WorkletRuntime> getRuntime(const std::string &name);

  std::vector<std::shared_ptr<WorkletRuntime>> getAllRuntimes();

  std::shared_ptr<WorkletRuntime> getUIRuntime();

  std::shared_ptr<WorkletRuntime> createWorkletRuntime(
      std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::shared_ptr<JSScheduler> &jsScheduler,
      bool isDevBundle,
      bool supportsLocking,
      const std::shared_ptr<const BigStringBuffer> &script,
      const std::string &sourceUrl,
      jsi::Runtime &rt,
      const jsi::Value &name,
      const jsi::Value &initializer = jsi::Value::undefined());

  std::shared_ptr<WorkletRuntime> createUIRuntime(
      std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const bool isDevBundle,
      const std::shared_ptr<const BigStringBuffer> &script,
      const std::string &sourceUrl);

 private:
  uint64_t getNextRuntimeId();

  std::atomic_uint64_t nextRuntimeId_{uiRuntimeId + 1};
  std::map<uint64_t, std::weak_ptr<WorkletRuntime>> weakRuntimes_;
  std::shared_mutex weakRuntimesMutex_;
  std::map<std::string, uint64_t> nameToRuntimeId_;
};

} // namespace worklets
