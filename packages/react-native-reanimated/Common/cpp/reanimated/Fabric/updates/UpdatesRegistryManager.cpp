#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/Tools/FeatureFlags.h>

#include <react/debug/react_native_assert.h>

#include <memory>
#include <utility>
#include <vector>

namespace reanimated {

namespace {
thread_local bool tCurrentThreadHoldsLock = false;
} // namespace

UpdatesRegistryManager::ScopedLock::ScopedLock(std::mutex &mutex) : guard_(mutex) {
  tCurrentThreadHoldsLock = true;
}

UpdatesRegistryManager::ScopedLock::~ScopedLock() {
  tCurrentThreadHoldsLock = false;
}

UpdatesRegistryManager::UpdatesRegistryManager(const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry)
    : staticPropsRegistry_(staticPropsRegistry) {}

UpdatesRegistryManager::ScopedLock UpdatesRegistryManager::lock() const {
  return ScopedLock{mutex_};
}

bool UpdatesRegistryManager::isLockedByCurrentThread() {
  return tCurrentThreadHoldsLock;
}

void UpdatesRegistryManager::addRegistry(const std::shared_ptr<UpdatesRegistry> &registry) {
  if (!registry) {
    throw std::invalid_argument("[Reanimated] Registry cannot be null");
  }
  registries_.push_back(registry);
}

void UpdatesRegistryManager::pauseReanimatedCommits() {
  if constexpr (!StaticFeatureFlags::getFlag("DISABLE_COMMIT_PAUSING_MECHANISM")) {
    isPaused_ = true;
  }
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

void UpdatesRegistryManager::markNodeAsRemovable(const std::shared_ptr<const ShadowNode> &shadowNode) {
  react_native_assert(isLockedByCurrentThread());
  // A new unmount restarts the detach sequence.
  removableShadowNodes_[shadowNode->getTag()] = {shadowNode->getFamilyShared(), false};
}

void UpdatesRegistryManager::unmarkNodeAsRemovable(Tag viewTag) {
  react_native_assert(isLockedByCurrentThread());
  removableShadowNodes_.erase(viewTag);
}

void UpdatesRegistryManager::handleNodeDetached(
    const Tag viewTag,
    const std::function<bool(const ShadowNodeFamily &)> &isNodeMounted) {
  react_native_assert(isLockedByCurrentThread());
  const auto it = removableShadowNodes_.find(viewTag);
  if (it == removableShadowNodes_.end()) {
    return;
  }
  if (it->second.family && isNodeMounted(*it->second.family)) {
    it->second.detached = true;
    return;
  }
  removableShadowNodes_.erase(it);
  evictNode(viewTag);
}

void UpdatesRegistryManager::handleNodeRemovals(const RootShadowNode &rootShadowNode) {
  react_native_assert(isLockedByCurrentThread());
  const auto mountedSurfaceId = rootShadowNode.getSurfaceId();

  for (auto it = removableShadowNodes_.begin(); it != removableShadowNodes_.end();) {
    const auto &[family, detached] = it->second;
    // A foreign root proves nothing (frozen screens remount after componentWillUnmount), and
    // the detach notification is ordered after the last update JS can still emit.
    const bool isRemoved = !family ||
        (detached && family->getSurfaceId() == mountedSurfaceId && family->getAncestors(rootShadowNode).empty());
    if (isRemoved) {
      evictNode(it->first);
      it = removableShadowNodes_.erase(it);
    } else {
      ++it;
    }
  }
}

void UpdatesRegistryManager::handleSurfaceUnmount(const SurfaceId surfaceId) {
  react_native_assert(isLockedByCurrentThread());
  for (auto it = removableShadowNodes_.begin(); it != removableShadowNodes_.end();) {
    const auto &[family, detached] = it->second;
    if (!family || (detached && family->getSurfaceId() == surfaceId)) {
      evictNode(it->first);
      it = removableShadowNodes_.erase(it);
    } else {
      ++it;
    }
  }
}

void UpdatesRegistryManager::evictNode(const Tag viewTag) {
  for (auto &registry : registries_) {
    registry->remove(viewTag);
  }
  staticPropsRegistry_->remove(viewTag);
}

PropsMap UpdatesRegistryManager::collectProps() {
  react_native_assert(isLockedByCurrentThread());
  PropsMap propsMap;
  for (auto &registry : registries_) {
    registry->collectProps(propsMap);
  }
  return propsMap;
}

void UpdatesRegistryManager::mergeRegistryProps(const Tag viewTag, folly::dynamic &target) {
  react_native_assert(isLockedByCurrentThread());
  for (const auto &registry : registries_) {
    registry->mergeInto(viewTag, target);
  }
}

#ifdef ANDROID

bool UpdatesRegistryManager::hasPropsToRevert() {
  react_native_assert(isLockedByCurrentThread());
  for (auto &registry : registries_) {
    if (registry->hasPropsToRevert()) {
      return true;
    }
  }
  return false;
}

void UpdatesRegistryManager::addToPropsMap(
    PropsMap &propsMap,
    const ShadowNodeFamily::Shared &shadowNodeFamily,
    const folly::dynamic &props) {
  auto it = propsMap.find(shadowNodeFamily);

  if (it == propsMap.cend()) {
    auto propsVector = std::vector<RawProps>{};
    propsVector.emplace_back(props);
    propsMap.emplace(shadowNodeFamily, propsVector);
  } else {
    it->second.emplace_back(props);
  }
}

void UpdatesRegistryManager::collectPropsToRevertBySurface(std::unordered_map<SurfaceId, PropsMap> &propsMapBySurface) {
  react_native_assert(isLockedByCurrentThread());
  for (const auto &registry : registries_) {
    registry->collectPropsToRevert(propsToRevertMap_);
  }

  for (const auto &[tag, pair] : propsToRevertMap_) {
    const auto &[shadowNodeFamily, props] = pair;
    const auto &staticStyle = staticPropsRegistry_->get(tag);
    folly::dynamic filteredStyle = folly::dynamic::object;

    for (const auto &propName : props) {
      if (!staticStyle.isNull() && staticStyle.count(propName) > 0) {
        filteredStyle[propName] = staticStyle[propName];
        continue;
      }

      const auto &nativeComponentName = shadowNodeFamily->getComponentName();
      const auto &interpolators = getComponentInterpolators(nativeComponentName);
      const auto &it = interpolators.find(propName);

      if (it != interpolators.end()) {
        filteredStyle[propName] = it->second->getDefaultValue().toDynamic();
        continue;
      }

      filteredStyle[propName] = nullptr;
    }

    const auto &surfaceId = shadowNodeFamily->getSurfaceId();
    auto &propsMap = propsMapBySurface[surfaceId];

    addToPropsMap(propsMap, shadowNodeFamily, filteredStyle);
  }
}

void UpdatesRegistryManager::clearPropsToRevert(const SurfaceId surfaceId) {
  react_native_assert(isLockedByCurrentThread());
  for (auto it = propsToRevertMap_.begin(); it != propsToRevertMap_.end();) {
    if (it->second.shadowNodeFamily->getSurfaceId() == surfaceId) {
      it = propsToRevertMap_.erase(it);
    } else {
      ++it;
    }
  }
}

#endif

} // namespace reanimated
