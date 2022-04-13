#include "NewestShadowNodesRegistry.h"

using namespace facebook::react;

namespace reanimated {

inline static Tag getKey(ShadowNode::Shared shadowNode) {
  return shadowNode->getTag();
}

ShadowNode::Shared NewestShadowNodesRegistry::set(
    ShadowNode::Shared shadowNode) {
  map_[getKey(shadowNode)] = shadowNode;
  return shadowNode; // for convenience
}

ShadowNode::Shared NewestShadowNodesRegistry::get(
    ShadowNode::Shared shadowNode) {
  const auto it = map_.find(getKey(shadowNode));
  return it == map_.cend() ? shadowNode : it->second;
}

const ShadowNode &NewestShadowNodesRegistry::get(const ShadowNode &shadowNode) {
  // TODO: don't return const reference here, convert to cloneNewestClone or
  // something
  const auto it = map_.find(shadowNode.getTag());
  return it == map_.cend() ? shadowNode : *it->second;
}

void NewestShadowNodesRegistry::remove(ShadowNode::Shared shadowNode) {
  // TODO: remove unused ancestors as well
  map_.erase(getKey(shadowNode));
}

void NewestShadowNodesRegistry::clear() {
  // TODO: remove this method
  map_.clear();
}

std::lock_guard<std::mutex> NewestShadowNodesRegistry::createLock() {
  return std::lock_guard<std::mutex>(mutex_);
}

} // namespace reanimated
