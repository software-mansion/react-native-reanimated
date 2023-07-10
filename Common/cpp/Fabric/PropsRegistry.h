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

  void setLastReanimatedRoot(
      RootShadowNode::Shared const &lastReanimatedRoot) noexcept {
    // TODO: synchronize with mutex?
    lastReanimatedRoot_ = lastReanimatedRoot;
  }

  bool isLastReanimatedRoot(
      RootShadowNode::Shared const &newRootShadowNode) const noexcept {
    // TODO: synchronize with mutex?
    return newRootShadowNode == lastReanimatedRoot_;
  }

  void pleaseSkipCommit() {
    letMeIn_ = true;
  }

  bool shouldSkipCommit() {
    return letMeIn_.exchange(false);
  }

 private:
  std::unordered_map<Tag, std::pair<ShadowNode::Shared, folly::dynamic>> map_;

  mutable std::mutex mutex_; // Protects `map_`.

  RootShadowNode::Shared lastReanimatedRoot_;

  std::atomic<bool> letMeIn_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
