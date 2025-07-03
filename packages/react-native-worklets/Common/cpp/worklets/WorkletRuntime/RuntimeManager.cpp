#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/WorkletRuntime/RuntimeManager.h>

#include <utility>

namespace worklets {
auto RuntimeManager::getRuntime(uint64_t runtimeId)
    -> std::shared_ptr<WorkletRuntime> {
  std::shared_lock lock(weakRuntimesMutex_);
  if (weakRuntimes_.contains(runtimeId)) {
    return weakRuntimes_.at(runtimeId).lock();
  }
  return nullptr;
}

auto RuntimeManager::getRuntime(const std::string &name)
    -> std::shared_ptr<WorkletRuntime> {
  std::shared_lock lock(weakRuntimesMutex_);
  if (nameToRuntimeId_.contains(name)) {
    return getRuntime(nameToRuntimeId_.at(name));
  }
  return nullptr;
}

auto RuntimeManager::getAllRuntimes()
    -> std::vector<std::shared_ptr<WorkletRuntime>> {
  std::shared_lock lock(weakRuntimesMutex_);

  auto runtimes = std::vector<std::shared_ptr<WorkletRuntime>>{};
  runtimes.reserve(weakRuntimes_.size());

  for (const auto &pair : weakRuntimes_) {
    if (auto runtime = pair.second.lock()) {
      runtimes.push_back(runtime);
    }
  }

  return runtimes;
}

auto RuntimeManager::getUIRuntime() -> std::shared_ptr<WorkletRuntime> {
  return getRuntime(uiRuntimeId);
}

auto RuntimeManager::createWorkletRuntime(
    std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy,
    const bool supportsLocking,
    const std::string &name,
    const jsi::Value &initializer) -> std::shared_ptr<WorkletRuntime> {
  const auto runtimeId = getNextRuntimeId();
  const auto jsQueue = jsiWorkletsModuleProxy->getJSQueue();

  auto workletRuntime = std::make_shared<WorkletRuntime>(
      runtimeId, jsQueue, name, true /* supportsLocking */
  );

  workletRuntime->init(std::move(jsiWorkletsModuleProxy));

  if (!initializer.isUndefined()) {
    auto initializerShareable = extractShareableOrThrow<ShareableWorklet>(
        workletRuntime->getJSIRuntime(),
        initializer,
        "[Worklets] Initializer must be a worklet.");
    workletRuntime->runGuarded(initializerShareable);
  }

  std::unique_lock lock(weakRuntimesMutex_);
  weakRuntimes_[runtimeId] = workletRuntime;
  nameToRuntimeId_[name] = runtimeId;

  return workletRuntime;
}

auto RuntimeManager::createUninitializedUIRuntime(
    const std::shared_ptr<MessageQueueThread> &jsQueue)
    -> std::shared_ptr<WorkletRuntime> {
  const auto uiRuntime = std::make_shared<WorkletRuntime>(
      uiRuntimeId, jsQueue, uiRuntimeName, true /* supportsLocking */
  );
  std::unique_lock lock(weakRuntimesMutex_);
  weakRuntimes_[uiRuntimeId] = uiRuntime;
  return uiRuntime;
}

} // namespace worklets
