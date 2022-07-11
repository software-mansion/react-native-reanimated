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
  const auto tag = shadowNode->getTag();
  const auto it = map_.find(tag);
  if (it == map_.cend()) {
    map_[tag] = std::make_pair(shadowNode, dynProps);
  } else {
    // it->second.first = shadowNode;
    it->second.second.update(dynProps);
  }
}

bool PropsRegistry::has(const Tag tag) const {
  return map_.find(tag) != map_.cend();
}

folly::dynamic PropsRegistry::get(const Tag tag) const {
  const auto it = map_.find(tag);
  react_native_assert(it != map_.cend());
  return it->second.second;
}

size_t PropsRegistry::size() const {
  return map_.size();
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
