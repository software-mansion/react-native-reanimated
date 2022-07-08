#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/components/root/RootShadowNode.h>
#include <react/renderer/core/ShadowNode.h>

#include <memory>
#include <unordered_map>
#include <utility>

using namespace facebook;
using namespace react;
using namespace jsi;

namespace reanimated {

class PropsRegistry {
 public:
  std::lock_guard<std::mutex> createLock() const;
  // returns a lock you need to hold when calling any of the methods below

  void set(ShadowNode::Shared shadowNode, folly::dynamic &&dynProps);

  bool has(const Tag tag) const;

  folly::dynamic get(const Tag tag) const;

  void for_each(std::function<void(
                    ShadowNodeFamily const &family,
                    const folly::dynamic &dynProps)> callback);

  void remove(const Tag tag);

  size_t size() const;

  void setLastReanimatedRoot(
      RootShadowNode::Shared const &lastReanimatedRoot) noexcept {
    lastReanimatedRoot_ = lastReanimatedRoot;
  }

  bool isLastReanimatedRoot(
      RootShadowNode::Shared const &newRootShadowNode) const noexcept {
    return newRootShadowNode == lastReanimatedRoot_;
  }

 private:
  std::unordered_map<Tag, std::pair<ShadowNode::Shared, folly::dynamic>> map_;

  mutable std::mutex mutex_; // Protects `map_`.

  RootShadowNode::Shared lastReanimatedRoot_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
