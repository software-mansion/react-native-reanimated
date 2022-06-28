#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

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

  void for_each(std::function<void(
                    ShadowNodeFamily const &family,
                    const folly::dynamic &dynProps)> callback);

 private:
  std::unordered_map<Tag, std::pair<ShadowNode::Shared, folly::dynamic>> map_;

  mutable std::mutex mutex_; // Protects `map_`.
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
