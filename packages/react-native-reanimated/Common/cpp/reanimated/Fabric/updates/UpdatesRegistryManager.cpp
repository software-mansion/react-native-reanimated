#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

namespace reanimated {

UpdatesRegistryManager::UpdatesRegistryManager(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
    const std::shared_ptr<CSSTransitionsRegistry> &cssTransitionsRegistry,
    const std::shared_ptr<AnimatedPropsRegistry> &animatedPropsRegistry,
    const std::shared_ptr<CSSAnimationsRegistry> &cssAnimationsRegistry,
    const GetAnimationTimestampFunction &getCurrentTimestamp)
    : staticPropsRegistry_(staticPropsRegistry),
      cssTransitionsRegistry_(cssTransitionsRegistry),
      animatedPropsRegistry_(animatedPropsRegistry),
      cssAnimationsRegistry_(cssAnimationsRegistry),
      getCurrentTimestamp_(getCurrentTimestamp) {}

std::lock_guard<std::mutex> UpdatesRegistryManager::lock() const {
  return std::lock_guard<std::mutex>{mutex_};
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
    staticPropsRegistry_->remove(tag);
    cssTransitionsRegistry_->remove(tag);
    animatedPropsRegistry_->remove(tag);
    cssAnimationsRegistry_->remove(tag);
    it = removableShadowNodes_.erase(it);
  }
}

PropsBatch UpdatesRegistryManager::getFrameUpdates(
    const double timestamp,
    const bool updateCssAnimations) {
  PropsBatch result;

  if (updateCssAnimations) {
    cssTransitionsRegistry_->lock();
    cssTransitionsRegistry_->flushFrameUpdates(result, timestamp);
  }
  {
    animatedPropsRegistry_->lock();
    animatedPropsRegistry_->flushFrameUpdates(result);
  }
  if (updateCssAnimations) {
    cssAnimationsRegistry_->lock();
    cssAnimationsRegistry_->flushFrameUpdates(result, timestamp);
  }

  return result;
}

PropsMap UpdatesRegistryManager::getAllProps() {
  PropsMap result;

  // We need to include static props as well because commit from JS may
  // happen during the animation and JS tree may have invalid node properties
  // referring to the intermediate state of the animation.
  // In order to fix this issue, we add all static props to the result to
  // make sure that latest props are always used.
  staticPropsRegistry_->collectAllProps(result);

  const auto timestamp = getCurrentTimestamp_();
  {
    cssTransitionsRegistry_->lock();
    cssTransitionsRegistry_->collectAllProps(result, timestamp);
  }
  {
    animatedPropsRegistry_->lock();
    animatedPropsRegistry_->collectAllProps(result);
  }
  {
    cssAnimationsRegistry_->lock();
    cssAnimationsRegistry_->collectAllProps(result, timestamp);
  }

  return result;
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
