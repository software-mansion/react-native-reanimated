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
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const bool isDevBundle,
    const bool supportsLocking,
    const std::shared_ptr<const BigStringBuffer> &script,
    const std::string &sourceUrl,
    jsi::Runtime &rt,
    const jsi::Value &name,
    const jsi::Value &initializer) -> std::shared_ptr<WorkletRuntime> {
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

  std::unique_lock lock(runtimesMutex_);
  weakRuntimes_[runtimeId] = workletRuntime;
  nameToRuntimeId_[name.asString(rt).utf8(rt)] = runtimeId;

  return workletRuntime;
}

auto RuntimeManager::createUIRuntime(
    std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const bool isDevBundle,
    const std::shared_ptr<const BigStringBuffer> &script,
    const std::string &sourceUrl) -> std::shared_ptr<WorkletRuntime> {
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
  std::unique_lock lock(runtimesMutex_);
  weakRuntimes_[uiRuntimeId] = uiRuntime;
  return uiRuntime;
}

} // namespace worklets
