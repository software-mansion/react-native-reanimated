#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/components/root/RootShadowNode.h>
#include <react/renderer/core/ShadowNode.h>

#include <unordered_map>
#include <utility>

using namespace facebook;
using namespace react;

namespace reanimated {

class PropsRegistry {
 public:
  std::lock_guard<std::mutex> createLock() const;
  // returns a lock you need to hold when calling any of the methods below

  void update(const ShadowNode::Shared &shadowNode, folly::dynamic &&props);

  void for_each(std::function<void(
                    const ShadowNodeFamily &family,
                    const folly::dynamic &props)> callback) const;

  void remove(const Tag tag);

  void pauseReanimatedCommits() {
    isPaused_ = true;
  }

  bool shouldReanimatedSkipCommit() {
#if REACT_NATIVE_MINOR_VERSION >= 73
    // In RN 0.73+ we have a mount hook that will properly unset this flag
    // after a non-Reanimated commit.
    return isPaused_;
#else
    return isPaused_.exchange(false);
#endif
  }

#if REACT_NATIVE_MINOR_VERSION >= 73
  void unpauseReanimatedCommits() {
    isPaused_ = false;
  }
#endif
  
  void pleaseFlush() {
    shouldFlush_ = true;
  }
  
  bool shouldFlush() {
    return shouldFlush_.exchange(false);
  }
  
 private:
  std::unordered_map<Tag, std::pair<ShadowNode::Shared, folly::dynamic>> map_;

  mutable std::mutex mutex_; // Protects `map_`.

  std::atomic<bool> isPaused_, shouldFlush_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
