#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/PropsRegistry.h>

namespace reanimated {

std::lock_guard<std::mutex> PropsRegistry::createLock() const {
  return std::lock_guard<std::mutex>(mutex_);
}

void PropsRegistry::update(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    folly::dynamic &&props) {
  const auto tag = shadowNode->getTag();
  const auto it = map_.find(tag);
  if (it == map_.cend()) {
    // we need to store ShadowNode because `ShadowNode::getFamily`
    // returns `ShadowNodeFamily const &` which is non-owning
    map_[tag] = std::make_pair(shadowNode, props);
  } else {
    // no need to update `.first` because ShadowNode's family never changes
    // merge new props with old props
    it->second.second.update(props);
  }
}

void PropsRegistry::for_each(
    std::function<
        void(const ShadowNodeFamily &family, const folly::dynamic &props)>
        callback) const {
  for (const auto &[_, value] : map_) {
    callback(value.first->getFamily(), value.second);
  }
}

void PropsRegistry::markNodeAsRemovable(
    const std::shared_ptr<const ShadowNode> &shadowNode) {
  removableShadowNodes_[shadowNode->getTag()] = shadowNode;
}

void PropsRegistry::unmarkNodeAsRemovable(Tag viewTag) {
  removableShadowNodes_.erase(viewTag);
}

void PropsRegistry::handleNodeRemovals(const RootShadowNode &rootShadowNode) {
  for (auto it = removableShadowNodes_.begin();
       it != removableShadowNodes_.end();) {
    const auto &shadowNode = it->second;
    const auto &family = shadowNode->getFamily();
    const auto &ancestors = family.getAncestors(rootShadowNode);

    // Skip if the node hasn't been removed
    if (!ancestors.empty()) {
      ++it;
      continue;
    }

    const auto tag = shadowNode->getTag();
    map_.erase(tag);
    it = removableShadowNodes_.erase(it);
  }
}

void PropsRegistry::remove(const Tag tag) {
  map_.erase(tag);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
