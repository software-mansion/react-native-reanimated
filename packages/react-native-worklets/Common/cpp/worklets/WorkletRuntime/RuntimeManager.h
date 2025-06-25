#pragma once

// #include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <jsi/jsi.h>
#include <worklets/Tools/UIScheduler.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <atomic>

namespace worklets {

class JSIWorkletsModuleProxy;

static constexpr uint64_t rnRuntimeId{0};
static constexpr uint64_t uiRuntimeId{1};

class RuntimeManager {
 public:
  auto getRuntime(uint64_t runtimeId) -> std::shared_ptr<WorkletRuntime> const;
  auto getRuntime(const std::string &name)
      -> std::shared_ptr<WorkletRuntime> const;

  auto getUIRuntime() -> std::shared_ptr<WorkletRuntime> const;

  auto createWorkletRuntime(
      std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const bool isDevBundle,
      const bool supportsLocking,
      const std::shared_ptr<const BigStringBuffer> &script,
      const std::string &sourceUrl,
      jsi::Runtime &rt,
      const jsi::Value &name) -> std::shared_ptr<WorkletRuntime>;

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
      const jsi::Value &initializer) -> std::shared_ptr<WorkletRuntime>;

  auto createUIRuntime(
      std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const bool isDevBundle,
      const std::shared_ptr<const BigStringBuffer> &script,
      const std::string &sourceUrl) -> std::shared_ptr<WorkletRuntime>;

  auto forEachRuntime(std::function<jsi::Value(jsi::Runtime &)> job) const
      -> void;

 private:
  auto getNextRuntimeId() -> uint64_t {
    return nextRuntimeId_.fetch_add(1, std::memory_order_relaxed);
  }

  std::atomic_uint64_t nextRuntimeId_{uiRuntimeId + 1};
  std::map<uint64_t, std::weak_ptr<WorkletRuntime>> weakRuntimes_;
  // TODO: Do we want this?
  std::map<std::string, uint64_t> runtimeNames_;
};

} // namespace worklets
