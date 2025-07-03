#pragma once

// #include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <jsi/jsi.h>
#include <worklets/Tools/UIScheduler.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <atomic>
#include <shared_mutex>

namespace worklets {

class JSIWorkletsModuleProxy;

/**
 * Unused, but kept for possible future use.
 */
static constexpr uint64_t rnRuntimeId{0};
static constexpr uint64_t uiRuntimeId{1};
static constexpr std::string uiRuntimeName{"UI"};

class RuntimeManager {
 public:
  auto getRuntime(uint64_t runtimeId) const -> std::shared_ptr<WorkletRuntime>;
  auto getRuntime(const std::string &name) const
      -> std::shared_ptr<WorkletRuntime>;

  auto getAllRuntimes() const -> std::vector<std::shared_ptr<WorkletRuntime>>;

  auto getUIRuntime() const -> std::shared_ptr<WorkletRuntime>;

  auto createWorkletRuntime(
      std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const bool isDevBundle,
      const bool supportsLocking,
      const std::shared_ptr<const BigStringBuffer> &script,
      const std::string &sourceUrl,
      jsi::Runtime &rt,
      const jsi::Value &name,
      const jsi::Value &initializer = jsi::Value::undefined())
      -> std::shared_ptr<WorkletRuntime>;

  auto createUIRuntime(
      std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const bool isDevBundle,
      const std::shared_ptr<const BigStringBuffer> &script,
      const std::string &sourceUrl) -> std::shared_ptr<WorkletRuntime>;

 private:
  auto getNextRuntimeId() -> uint64_t {
    return nextRuntimeId_.fetch_add(1, std::memory_order_relaxed);
  }

  std::atomic_uint64_t nextRuntimeId_{uiRuntimeId + 1};
  std::map<uint64_t, std::weak_ptr<WorkletRuntime>> weakRuntimes_;
  std::shared_mutex runtimesMutex_;
  std::map<std::string, uint64_t> nameToRuntimeId_;
};

} // namespace worklets
