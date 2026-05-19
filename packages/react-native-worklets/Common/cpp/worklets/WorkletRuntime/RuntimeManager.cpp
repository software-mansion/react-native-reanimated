#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/WorkletRuntime/RuntimeData.h>
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
    const std::shared_ptr<const JSIWorkletsModuleProxy> &sourceProxy,
    const std::string &name,
    const std::shared_ptr<SerializableWorklet> &initializer,
    const std::shared_ptr<AsyncQueue> &queue,
    bool enableEventLoop) {
  const auto runtimeId = getNextRuntimeId();

  const auto workletRuntime =
      std::make_shared<WorkletRuntime>(runtimeId, RuntimeData::RuntimeKind::Worker, name, queue, enableEventLoop);
  const auto targetProxy = JSIWorkletsModuleProxy::createForNewRuntime(sourceProxy, runtimeId);

  workletRuntime->init(targetProxy);

  if (initializer) {
    workletRuntime->runSync(initializer);
  }

  registerRuntime(runtimeId, workletRuntime);

  return workletRuntime;
}

std::shared_ptr<WorkletRuntime> RuntimeManager::createUninitializedUIRuntime(
    const std::shared_ptr<AsyncQueue> &uiAsyncQueue) {
  const auto uiRuntime = std::make_shared<WorkletRuntime>(
      RuntimeData::uiRuntimeId,
      RuntimeData::RuntimeKind::UI,
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
