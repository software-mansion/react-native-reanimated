#include "NewestShadowNodesRegistry.h"

using namespace facebook::react;

namespace reanimated {

inline static Tag getKey(ShadowNode::Shared shadowNode) {
  return shadowNode->getTag();
}

ShadowNode::Shared NewestShadowNodesRegistry::set(
    ShadowNode::Shared shadowNode) {
  std::lock_guard<std::mutex> lock(mutex_);
  map_[getKey(shadowNode)] = shadowNode;
  return shadowNode; // for convenience
}

ShadowNode::Shared NewestShadowNodesRegistry::get(
    ShadowNode::Shared shadowNode) {
  std::lock_guard<std::mutex> lock(mutex_);
  const auto it = map_.find(getKey(shadowNode));
  return it == map_.cend() ? shadowNode : it->second;
}

void NewestShadowNodesRegistry::remove(ShadowNode::Shared shadowNode) {
  std::lock_guard<std::mutex> lock(mutex_);
  map_.erase(getKey(shadowNode));
}

} // namespace reanimated
