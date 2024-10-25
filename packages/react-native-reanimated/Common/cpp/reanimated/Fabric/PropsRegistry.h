#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/components/root/RootShadowNode.h>
#include <react/renderer/core/ShadowNode.h>

#include <unordered_map>
#include <utility>

namespace reanimated {

class PropsRegistry {
 public:
  std::lock_guard<std::mutex> createLock() const;
  // returns a lock you need to hold when calling any of the methods below

  void update(
      const facebook::react::ShadowNode::Shared &shadowNode,
      folly::dynamic &&props);

  void for_each(std::function<void(
                    const facebook::react::ShadowNodeFamily &family,
                    const folly::dynamic &props)> callback) const;

  void remove(const facebook::react::Tag tag);

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

 private:
  std::unordered_map<
      facebook::react::Tag,
      std::pair<facebook::react::ShadowNode::Shared, folly::dynamic>>
      map_;

  mutable std::mutex mutex_; // Protects `map_`.

  std::atomic<bool> isPaused_;
  std::atomic<bool> shouldCommitAfterPause_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
