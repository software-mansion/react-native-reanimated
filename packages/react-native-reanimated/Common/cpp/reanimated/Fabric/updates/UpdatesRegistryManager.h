#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <utility>

namespace reanimated {

class UpdatesRegistryManager {
 public:
  // returns a lock you need to hold when calling any of the methods below
  std::lock_guard<std::mutex> createLock() const {
    return std::lock_guard<std::mutex>{mutex_};
  }

  // TODO - ensure that other sublibraries can easily hook into this registry
  // manager (e.g. add priority to registries)
  void addRegistry(const std::shared_ptr<UpdatesRegistry> &registry) {
    if (!registry) {
      throw std::invalid_argument("[Reanimated] Registry cannot be null");
    }
    registries_.push_back(std::move(registry));
  }

  void pauseReanimatedCommits() {
    isPaused_ = true;
  }
  bool shouldReanimatedSkipCommit() {
    return isPaused_;
  }
  void unpauseReanimatedCommits() {
    isPaused_ = false;
  }
  void pleaseCommitAfterPause() {
    shouldCommitAfterPause_ = true;
  }
  bool shouldCommitAfterPause() {
    return shouldCommitAfterPause_.exchange(false);
  }

  PropsMap collectProps();

 private:
  mutable std::mutex mutex_;

  std::atomic<bool> isPaused_;
  std::atomic<bool> shouldCommitAfterPause_;

  std::vector<std::shared_ptr<UpdatesRegistry>> registries_;
};

} // namespace reanimated
