#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

namespace reanimated {

UpdatesRegistryManager::UpdatesRegistryManager(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry)
    : staticPropsRegistry_(staticPropsRegistry) {}

std::lock_guard<std::mutex> UpdatesRegistryManager::lock() const {
  return std::lock_guard<std::mutex>{mutex_};
}

void UpdatesRegistryManager::addRegistry(
    const std::shared_ptr<UpdatesRegistry> &registry) {
  if (!registry) {
    throw std::invalid_argument("[Reanimated] Registry cannot be null");
  }
  registries_.push_back(registry);
}

void UpdatesRegistryManager::pauseReanimatedCommits() {
  isPaused_ = true;
}

bool UpdatesRegistryManager::shouldReanimatedSkipCommit() {
  return isPaused_;
}

void UpdatesRegistryManager::unpauseReanimatedCommits() {
  isPaused_ = false;
}

void UpdatesRegistryManager::pleaseCommitAfterPause() {
  shouldCommitAfterPause_ = true;
}

void UpdatesRegistryManager::cancelCommitAfterPause() {
  shouldCommitAfterPause_ = false;
}

bool UpdatesRegistryManager::shouldCommitAfterPause() {
  return shouldCommitAfterPause_.exchange(false);
}

void UpdatesRegistryManager::markNodeAsRemovable(
    const ShadowNode::Shared &shadowNode) {
  removableShadowNodes_[shadowNode->getTag()] = shadowNode;
}

void UpdatesRegistryManager::unmarkNodeAsRemovable(Tag viewTag) {
  removableShadowNodes_.erase(viewTag);
}

void UpdatesRegistryManager::handleNodeRemovals(
    const RootShadowNode &rootShadowNode) {
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
    for (auto &registry : registries_) {
      registry->remove(tag);
    }
    staticPropsRegistry_->remove(tag);
    it = removableShadowNodes_.erase(it);
  }
}

void UpdatesRegistryManager::markNodeAsImmediateRemovable(Tag tag) {
  immediateRemovableShadowNodes_.emplace(tag);
}

void UpdatesRegistryManager::unmarkNodeAsImmediateRemovable(Tag tag) {
  immediateRemovableShadowNodes_.erase(tag);
}

void UpdatesRegistryManager::removeImmediateRemovableNodes() {
  for (auto& tag : immediateRemovableShadowNodes_) {
      for (auto &registry : registries_) {
          registry->remove(tag);
      }
      staticPropsRegistry_->remove(tag);
  }
  immediateRemovableShadowNodes_.clear();
}

PropsMap UpdatesRegistryManager::collectProps() {
  PropsMap propsMap;
  for (auto &registry : registries_) {
    registry->collectProps(propsMap);
  }
  return propsMap;
}

#ifdef ANDROID

bool UpdatesRegistryManager::hasPropsToRevert() {
  for (auto &registry : registries_) {
    if (registry->hasPropsToRevert()) {
      return true;
    }
  }
  return false;
}

void UpdatesRegistryManager::addToPropsMap(
    PropsMap &propsMap,
    const ShadowNode::Shared &shadowNode,
    const folly::dynamic &props) {
  auto &family = shadowNode->getFamily();
  auto it = propsMap.find(&family);

  if (it == propsMap.cend()) {
    auto propsVector = std::vector<RawProps>{};
    propsVector.emplace_back(props);
    propsMap.emplace(&family, propsVector);
  } else {
    it->second.emplace_back(props);
  }
}

void UpdatesRegistryManager::collectPropsToRevertBySurface(
    std::unordered_map<SurfaceId, PropsMap> &propsMapBySurface) {
  for (const auto &registry : registries_) {
    registry->collectPropsToRevert(propsToRevertMap_);
  }

  for (const auto &[tag, pair] : propsToRevertMap_) {
    const auto &[shadowNode, props] = pair;
    const auto &staticStyle = staticPropsRegistry_->get(tag);
    folly::dynamic filteredStyle = folly::dynamic::object;

    for (const auto &propName : props) {
      if (!staticStyle.isNull() && staticStyle.count(propName) > 0) {
        filteredStyle[propName] = staticStyle[propName];
        continue;
      }

      const auto &it = PROPERTY_INTERPOLATORS_CONFIG.find(propName);
      if (it != PROPERTY_INTERPOLATORS_CONFIG.end()) {
        filteredStyle[propName] = it->second->getDefaultValue().toDynamic();
      } else {
        filteredStyle[propName] = nullptr;
      }
    }

    const auto &surfaceId = shadowNode->getSurfaceId();
    auto &propsMap = propsMapBySurface[surfaceId];

    addToPropsMap(propsMap, shadowNode, filteredStyle);
  }
}

void UpdatesRegistryManager::clearPropsToRevert(const SurfaceId surfaceId) {
  for (auto it = propsToRevertMap_.begin(); it != propsToRevertMap_.end();) {
    if (it->second.shadowNode->getSurfaceId() == surfaceId) {
      it = propsToRevertMap_.erase(it);
    } else {
      ++it;
    }
  }
}

#endif

} // namespace reanimated
