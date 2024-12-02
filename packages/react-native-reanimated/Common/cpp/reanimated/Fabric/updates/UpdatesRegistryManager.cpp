#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

namespace reanimated {

std::lock_guard<std::mutex> UpdatesRegistryManager::createLock() const {
  return std::lock_guard<std::mutex>{mutex_};
}

void UpdatesRegistryManager::addRegistry(
    const std::shared_ptr<UpdatesRegistry> &registry) {
  if (!registry) {
    throw std::invalid_argument("[Reanimated] Registry cannot be null");
  }
  registries_.push_back(registry);
}

void UpdatesRegistryManager::pauseReanimatedCommits() {
  isPaused_ = true;
}

bool UpdatesRegistryManager::shouldReanimatedSkipCommit() {
  return isPaused_;
}

void UpdatesRegistryManager::unpauseReanimatedCommits() {
  isPaused_ = false;
}

void UpdatesRegistryManager::pleaseCommitAfterPause() {
  shouldCommitAfterPause_ = true;
}

bool UpdatesRegistryManager::shouldCommitAfterPause() {
  return shouldCommitAfterPause_.exchange(false);
}

PropsMap UpdatesRegistryManager::collectProps() {
  PropsMap propsMap;
  for (auto &registry : registries_) {
    registry->collectProps(propsMap);
  }
  return propsMap;
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
