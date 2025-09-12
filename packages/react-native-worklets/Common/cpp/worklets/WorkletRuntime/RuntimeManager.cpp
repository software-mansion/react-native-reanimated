#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/WorkletRuntime/RuntimeManager.h>

#include <utility>

namespace worklets {

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

#ifdef WORKLETS_BUNDLE_MODE
std::shared_ptr<WorkletRuntime> RuntimeManager::getRuntime(
    jsi::Runtime *runtime) {
  std::shared_lock lock(weakRuntimesMutex_);
  if (runtimeAddressToRuntimeId_.contains(runtime)) {
    return getRuntime(runtimeAddressToRuntimeId_.at(runtime));
  }
  return nullptr;
}
#endif // WORKLETS_BUNDLE_MODE

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
    const std::string &name,
    std::shared_ptr<SerializableWorklet> initializer,
    const std::shared_ptr<AsyncQueue> &queue,
    bool enableEventLoop) {
  const auto runtimeId = getNextRuntimeId();
  const auto jsQueue = jsiWorkletsModuleProxy->getJSQueue();

  auto workletRuntime = std::make_shared<WorkletRuntime>(
      runtimeId, jsQueue, name, queue, enableEventLoop);

  workletRuntime->init(std::move(jsiWorkletsModuleProxy));

  if (initializer) {
    workletRuntime->runGuarded(initializer);
  }

  registerRuntime(runtimeId, name, workletRuntime);

  return workletRuntime;
}

std::shared_ptr<WorkletRuntime> RuntimeManager::createUninitializedUIRuntime(
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<AsyncQueue> &uiAsyncQueue) {
  const auto uiRuntime = std::make_shared<WorkletRuntime>(
      uiRuntimeId, jsQueue, uiRuntimeName, uiAsyncQueue);

  registerRuntime(uiRuntimeId, uiRuntimeName, uiRuntime);

  return uiRuntime;
}

uint64_t RuntimeManager::getNextRuntimeId() {
  return nextRuntimeId_.fetch_add(1, std::memory_order_relaxed);
}

void RuntimeManager::registerRuntime(
    const uint64_t runtimeId,
    const std::string &name,
    const std::shared_ptr<WorkletRuntime> &workletRuntime) {
  std::unique_lock lock(weakRuntimesMutex_);
  weakRuntimes_[runtimeId] = workletRuntime;
  nameToRuntimeId_[name] = runtimeId;
#ifdef WORKLETS_BUNDLE_MODE
  runtimeAddressToRuntimeId_[&workletRuntime->getJSIRuntime()] = runtimeId;
#endif // WORKLETS_BUNDLE_MODE
}

} // namespace worklets
