#ifdef RCT_NEW_ARCH_ENABLED

#include "PropsRegistry.h"

using namespace facebook::react;

namespace reanimated {

std::lock_guard<std::mutex> PropsRegistry::createLock() const {
  return std::lock_guard<std::mutex>(mutex_);
}

void PropsRegistry::set(
    ShadowNode::Shared shadowNode,
    folly::dynamic &&dynProps) {
  map_[shadowNode->getTag()] = std::make_pair(shadowNode, dynProps);
}

void PropsRegistry::for_each(std::function<void(
                                 ShadowNodeFamily const &family,
                                 const folly::dynamic &dynProps)> callback) {
  for (const auto &pair : map_) {
    const ShadowNodeFamily &family = pair.second.first->getFamily();
    const folly::dynamic &dynProps = pair.second.second;
    callback(family, dynProps);
  }
}

void PropsRegistry::remove(const Tag tag) {
  map_.erase(tag);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
