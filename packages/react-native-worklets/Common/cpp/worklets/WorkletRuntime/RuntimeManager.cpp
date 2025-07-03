#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/WorkletRuntime/RuntimeManager.h>

#include <utility>

namespace worklets {
auto RuntimeManager::getRuntime(uint64_t runtimeId) const
    -> std::shared_ptr<WorkletRuntime> {
  if (runtimeId == rnRuntimeId) {
    return getUIRuntime();
  }
  if (weakRuntimes_.contains(runtimeId)) {
    return weakRuntimes_.at(runtimeId).lock();
  }
  return nullptr;
}

auto RuntimeManager::getRuntime(const std::string &name) const
    -> std::shared_ptr<WorkletRuntime> {
  if (nameToRuntimeId_.contains(name)) {
    return getRuntime(nameToRuntimeId_.at(name));
  }
  return nullptr;
}

auto RuntimeManager::getAllRuntimes() const
    -> std::vector<std::shared_ptr<WorkletRuntime>> {
  auto runtimes = std::vector<std::shared_ptr<WorkletRuntime>>{};
  runtimes.reserve(weakRuntimes_.size());

  std::shared_lock lock(runtimesMutex_);
  for (const auto &pair : weakRuntimes_) {
    if (auto runtime = pair.second.lock()) {
      runtimes.push_back(runtime);
    }
  }

  return runtimes;
}

auto RuntimeManager::getUIRuntime() const -> std::shared_ptr<WorkletRuntime> {
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

  std::unique_lock lock(runtimesMutex_);
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
  std::unique_lock lock(runtimesMutex_);
  weakRuntimes_[uiRuntimeId] = uiRuntime;
  return uiRuntime;
}

} // namespace worklets
