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
    const bool supportsLocking,
    const std::string &name,
    std::shared_ptr<ShareableWorklet> initializer) {
  const auto runtimeId = getNextRuntimeId();
  const auto jsQueue = jsiWorkletsModuleProxy->getJSQueue();

  auto workletRuntime = std::make_shared<WorkletRuntime>(
      runtimeId, jsQueue, name, true /* supportsLocking */
  );

  workletRuntime->init(std::move(jsiWorkletsModuleProxy));

  if (initializer) {
    workletRuntime->runGuarded(initializer);
  }

  std::unique_lock lock(weakRuntimesMutex_);
  weakRuntimes_[runtimeId] = workletRuntime;
  nameToRuntimeId_[name] = runtimeId;

  return workletRuntime;
}

std::shared_ptr<WorkletRuntime> RuntimeManager::createUninitializedUIRuntime(
    const std::shared_ptr<MessageQueueThread> &jsQueue) {
  const auto uiRuntime = std::make_shared<WorkletRuntime>(
      uiRuntimeId, jsQueue, uiRuntimeName, true /* supportsLocking */
  );
  std::unique_lock lock(weakRuntimesMutex_);
  weakRuntimes_[uiRuntimeId] = uiRuntime;
  return uiRuntime;
}

uint64_t RuntimeManager::getNextRuntimeId() {
  return nextRuntimeId_.fetch_add(1, std::memory_order_relaxed);
}

} // namespace worklets
