#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/WorkletRuntime/RuntimeManager.h>

#include <utility>

namespace worklets {

const std::string uiRuntimeName{"UI"};

std::shared_ptr<WorkletRuntime> RuntimeManager::getRuntime(uint64_t runtimeId) {
  std::shared_lock lock(weakRuntimesMutex_);
  if (weakRuntimes_.contains(runtimeId)) {
    return weakRuntimes_.at(runtimeId).lock();
  }
  return nullptr;
}

std::shared_ptr<WorkletRuntime> RuntimeManager::getRuntime(
    const std::string &name) {
  std::shared_lock lock(weakRuntimesMutex_);
  if (nameToRuntimeId_.contains(name)) {
    return getRuntime(nameToRuntimeId_.at(name));
  }
  return nullptr;
}

std::vector<std::shared_ptr<WorkletRuntime>> RuntimeManager::getAllRuntimes() {
  std::shared_lock lock(weakRuntimesMutex_);

  std::vector<std::shared_ptr<WorkletRuntime>> runtimes;
  runtimes.reserve(weakRuntimes_.size());

  for (const auto &[id, weakRuntime] : weakRuntimes_) {
    if (auto runtime = weakRuntime.lock()) {
      runtimes.push_back(runtime);
    }
  }

  return runtimes;
}

std::shared_ptr<WorkletRuntime> RuntimeManager::getUIRuntime() {
  return getRuntime(uiRuntimeId);
}

std::shared_ptr<WorkletRuntime> RuntimeManager::createWorkletRuntime(
    std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const bool isDevBundle,
    const bool supportsLocking,
    const std::shared_ptr<const BigStringBuffer> &script,
    const std::string &sourceUrl,
    jsi::Runtime &rt,
    const jsi::Value &name,
    const jsi::Value &initializer) {
  const auto runtimeId = getNextRuntimeId();

  auto workletRuntime = std::make_shared<WorkletRuntime>(
      runtimeId,
      std::move(jsiWorkletsModuleProxy),
      jsQueue,
      jsScheduler,
      name.asString(rt).utf8(rt),
      true /* supportsLocking */,
      isDevBundle,
      script,
      sourceUrl);

  if (!initializer.isUndefined()) {
    auto initializerShareable = extractShareableOrThrow<ShareableWorklet>(
        rt, initializer, "[Worklets] Initializer must be a worklet.");
    workletRuntime->runGuarded(initializerShareable);
  }

  std::unique_lock lock(weakRuntimesMutex_);
  weakRuntimes_[runtimeId] = workletRuntime;
  nameToRuntimeId_[name.asString(rt).utf8(rt)] = runtimeId;

  return workletRuntime;
}

std::shared_ptr<WorkletRuntime> RuntimeManager::createUIRuntime(
    std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const bool isDevBundle,
    const std::shared_ptr<const BigStringBuffer> &script,
    const std::string &sourceUrl) {
  const auto uiRuntime = std::make_shared<WorkletRuntime>(
      uiRuntimeId,
      std::move(jsiWorkletsModuleProxy),
      jsQueue,
      jsScheduler,
      uiRuntimeName,
      true /* supportsLocking */,
      isDevBundle,
      script,
      sourceUrl);
  std::unique_lock lock(weakRuntimesMutex_);
  weakRuntimes_[uiRuntimeId] = uiRuntime;
  return uiRuntime;
}

uint64_t RuntimeManager::getNextRuntimeId() {
  return nextRuntimeId_.fetch_add(1, std::memory_order_relaxed);
}

} // namespace worklets
