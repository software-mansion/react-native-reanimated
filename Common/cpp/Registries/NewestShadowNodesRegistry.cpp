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

bool NewestShadowNodesRegistry::has(ShadowNode::Shared shadowNode) {
  return map_.find(getKey(shadowNode)) != map_.cend();
}

void NewestShadowNodesRegistry::setParent(Tag parent, Tag child) {
  map2_[child] = parent;
}

void NewestShadowNodesRegistry::remove(Tag tag) {
  if (map_.find(tag) == map_.cend()) {
    return;
  }

  auto shadowNode = map_[tag];

  while (shadowNode != nullptr) {
    bool hasAnyChildInMap = false;
    for (const auto &child : shadowNode->getChildren()) {
      if (has(child)) {
        hasAnyChildInMap = true;
        break;
      }
    }

    if (hasAnyChildInMap) {
      break;
    }

    map_.erase(shadowNode->getTag());
    auto parentTag = map2_[shadowNode->getTag()];
    map2_.erase(shadowNode->getTag());
    shadowNode = map_[parentTag];
  }
}

void NewestShadowNodesRegistry::clear() {
  // TODO: remove this method
  map_.clear();
}

std::lock_guard<std::mutex> NewestShadowNodesRegistry::createLock() {
  return std::lock_guard<std::mutex>(mutex_);
}

} // namespace reanimated
