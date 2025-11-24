#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/WorkletRuntime/RuntimeManager.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace worklets {

std::shared_ptr<WorkletRuntime> RuntimeManager::getRuntime(uint64_t runtimeId) {
  std::shared_lock lock(weakRuntimesMutex_);
  if (weakRuntimes_.contains(runtimeId)) {
    return weakRuntimes_.at(runtimeId).lock();
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
  return getRuntime(RuntimeData::uiRuntimeId);
}

std::shared_ptr<WorkletRuntime> RuntimeManager::createWorkletRuntime(
    std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy,
    const std::string &name,
    const std::shared_ptr<SerializableWorklet> &initializer,
    const std::shared_ptr<AsyncQueue> &queue,
    bool enableEventLoop) {
  const auto runtimeId = getNextRuntimeId();
  const auto jsQueue = jsiWorkletsModuleProxy->getJSQueue();

  auto workletRuntime = std::make_shared<WorkletRuntime>(runtimeId, jsQueue, name, queue, enableEventLoop);

  workletRuntime->init(std::move(jsiWorkletsModuleProxy));

  if (initializer) {
    workletRuntime->runSync(initializer);
  }

  registerRuntime(runtimeId, workletRuntime);

  return workletRuntime;
}

std::shared_ptr<WorkletRuntime> RuntimeManager::createUninitializedUIRuntime(
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<AsyncQueue> &uiAsyncQueue) {
  const auto uiRuntime = std::make_shared<WorkletRuntime>(
      RuntimeData::uiRuntimeId,
      jsQueue,
      RuntimeData::uiRuntimeName,
      uiAsyncQueue,
      /*enableEventLoop*/ false);

  registerRuntime(RuntimeData::uiRuntimeId, uiRuntime);

  return uiRuntime;
}

uint64_t RuntimeManager::getNextRuntimeId() {
  return nextRuntimeId_.fetch_add(1, std::memory_order_relaxed);
}

void RuntimeManager::registerRuntime(const uint64_t runtimeId, const std::shared_ptr<WorkletRuntime> &workletRuntime) {
  std::unique_lock registrationLock(registrationMutex_);
  std::unique_lock lock(weakRuntimesMutex_);
  weakRuntimes_[runtimeId] = workletRuntime;
}

void RuntimeManager::pause() {
  registrationMutex_.lock();
}

void RuntimeManager::resume() {
  registrationMutex_.unlock();
}

} // namespace worklets
