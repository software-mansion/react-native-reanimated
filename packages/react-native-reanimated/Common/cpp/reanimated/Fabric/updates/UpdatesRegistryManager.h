#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <memory>
#include <utility>
#include <vector>

namespace reanimated {

class UpdatesRegistryManager {
 public:
  std::lock_guard<std::mutex> createLock() const;

  // TODO - ensure that other sublibraries can easily hook into this registry
  // manager (e.g. add priority to registries)
  void addRegistry(const std::shared_ptr<UpdatesRegistry> &registry);

  void pauseReanimatedCommits();
  bool shouldReanimatedSkipCommit();
  void unpauseReanimatedCommits();

  void pleaseCommitAfterPause();
  bool shouldCommitAfterPause();

  PropsMap collectProps();

 private:
  mutable std::mutex mutex_;
  std::atomic<bool> isPaused_;
  std::atomic<bool> shouldCommitAfterPause_;
  std::vector<std::shared_ptr<UpdatesRegistry>> registries_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
