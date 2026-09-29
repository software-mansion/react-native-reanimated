#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/Tools/FeatureFlags.h>

#include <react/debug/react_native_assert.h>

#include <algorithm>
#include <memory>
#include <unordered_set>
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
  removableShadowNodes_[shadowNode->getTag()] = shadowNode->getFamilyShared();
}

void UpdatesRegistryManager::unmarkNodeAsRemovable(Tag viewTag) {
  react_native_assert(isLockedByCurrentThread());
  removableShadowNodes_.erase(viewTag);
  if (removedShadowNodes_.contains(viewTag)) {
    forgetRemovedShadowNode(viewTag);
  }
}

void UpdatesRegistryManager::handleNodeRemovals(const RootShadowNode &rootShadowNode) {
  react_native_assert(isLockedByCurrentThread());
  RemovableShadowNodes remainingShadowNodes;

  for (const auto &[tag, shadowNodeFamily] : removableShadowNodes_) {
    if (!shadowNodeFamily) {
      continue;
    }

    if (shadowNodeFamily->getAncestors(rootShadowNode).empty()) {
      for (auto &registry : registries_) {
        registry->removeUnmounted(tag);
      }
      staticPropsRegistry_->remove(tag);
      // The view's mapper is stopped asynchronously and can still update it,
      // so the registries keep ignoring the tag while the view can be reached.
      removedShadowNodes_.emplace(tag, shadowNodeFamily);
    } else {
      remainingShadowNodes.emplace(tag, shadowNodeFamily);
    }
  }

  removableShadowNodes_ = std::move(remainingShadowNodes);
  forgetReattachedShadowNodes(rootShadowNode);
  pruneRemovedShadowNodes();
}

void UpdatesRegistryManager::forgetRemovedShadowNode(const Tag tag) {
  for (auto &registry : registries_) {
    registry->forgetRemoved(tag);
  }
  removedShadowNodes_.erase(tag);
}

// A removed view can be shown again without mounting its component again,
// so only the views that are still being updated are checked for that.
void UpdatesRegistryManager::forgetReattachedShadowNodes(const RootShadowNode &rootShadowNode) {
  std::unordered_set<Tag> ignoredTags;
  for (auto &registry : registries_) {
    registry->takeIgnoredTags(ignoredTags);
  }
  for (const auto tag : ignoredTags) {
    const auto it = removedShadowNodes_.find(tag);
    if (it == removedShadowNodes_.end()) {
      continue;
    }
    const auto shadowNodeFamily = it->second.lock();
    if (shadowNodeFamily && !shadowNodeFamily->getAncestors(rootShadowNode).empty()) {
      forgetRemovedShadowNode(tag);
    }
  }
}

// A destroyed family has no shadow node wrappers left, so no update can reach
// its tag anymore. Pruning runs when the map doubles, to stay amortized O(1).
void UpdatesRegistryManager::pruneRemovedShadowNodes() {
  if (removedShadowNodes_.size() <= removedShadowNodesPruneThreshold_) {
    return;
  }
  std::vector<Tag> destroyedTags;
  for (const auto &[tag, shadowNodeFamily] : removedShadowNodes_) {
    if (shadowNodeFamily.expired()) {
      destroyedTags.push_back(tag);
    }
  }
  for (const auto tag : destroyedTags) {
    forgetRemovedShadowNode(tag);
  }
  removedShadowNodesPruneThreshold_ = std::max<size_t>(removedShadowNodes_.size() * 2, 64);
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
