#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/WorkletRuntime/RuntimeManager.h>

namespace worklets {
auto RuntimeManager::getRuntime(uint64_t runtimeId)
    -> std::shared_ptr<WorkletRuntime> const {
  if (runtimeId == rnRuntimeId) {
    return getUIRuntime();
  }
  if (weakRuntimes_.contains(runtimeId)) {
    return weakRuntimes_.at(runtimeId).lock();
  }
  return nullptr;
}

auto RuntimeManager::getRuntime(const std::string &name)
    -> std::shared_ptr<WorkletRuntime> const {
  if (runtimeNames_.contains(name)) {
    return getRuntime(runtimeNames_.at(name));
  }
  return nullptr;
}

auto RuntimeManager::getUIRuntime() -> std::shared_ptr<WorkletRuntime> const {
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
    const jsi::Value &name) -> std::shared_ptr<WorkletRuntime> {
  auto workletRuntime = std::make_shared<WorkletRuntime>(
      getNextRuntimeId(),
      std::move(jsiWorkletsModuleProxy),
      jsQueue,
      jsScheduler,
      name.asString(rt).utf8(rt),
      true /* supportsLocking */,
      isDevBundle,
      script,
      sourceUrl);
  return workletRuntime;
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
  auto workletRuntime = createWorkletRuntime(
      std::move(jsiWorkletsModuleProxy),
      jsQueue,
      jsScheduler,
      isDevBundle,
      supportsLocking,
      script,
      sourceUrl,
      rt,
      name);
  auto initializerShareable = extractShareableOrThrow<ShareableWorklet>(
      rt, initializer, "[Worklets] Initializer must be a worklet.");
  workletRuntime->runGuarded(initializerShareable);
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
      getNextRuntimeId(),
      std::move(jsiWorkletsModuleProxy),
      jsQueue,
      jsScheduler,
      "Reanimated UI runtime",
      true /* supportsLocking */,
      isDevBundle,
      script,
      sourceUrl);
  weakRuntimes_[uiRuntimeId] = uiRuntime;
  return uiRuntime;
}

auto RuntimeManager::forEachRuntime(
    std::function<jsi::Value(jsi::Runtime &)> job) const -> void {
  for (const auto &[_, weakRuntime] : weakRuntimes_) {
    auto strongRuntime = weakRuntime.lock();
    if (!strongRuntime) {
      continue;
    }
    strongRuntime->executeSync(job);
  }
}

} // namespace worklets
