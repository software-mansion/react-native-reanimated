#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/Tools/FeatureFlags.h>

#include <reanimated/Compat/ReactNativeDebug.h>

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

UpdatesRegistryManager::UpdatesRegistryManager(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
    const std::shared_ptr<MountedRootsRegistry> &mountedRootsRegistry)
    : staticPropsRegistry_(staticPropsRegistry), mountedRootsRegistry_(mountedRootsRegistry) {}

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
  for (auto &registry : registries_) {
    registry->handleRemount(viewTag);
  }
}

std::vector<Tag> UpdatesRegistryManager::handleNodeRemovals(const SurfaceId surfaceId) {
  react_native_assert(isLockedByCurrentThread());
  std::vector<Tag> removedTags;
  std::erase_if(removableShadowNodes_, [&](const auto &entry) {
    const auto &[tag, shadowNodeFamily] = entry;
    if (!shadowNodeFamily) {
      return true;
    }
    const auto nodeSurfaceId = shadowNodeFamily->getSurfaceId();
    if (nodeSurfaceId != surfaceId && mountedRootsRegistry_->isRunning(nodeSurfaceId)) {
      return false;
    }
    if (mountedRootsRegistry_->isMounted(*shadowNodeFamily)) {
      return false;
    }
    for (auto &registry : registries_) {
      registry->removeUnmounted(shadowNodeFamily);
    }
    staticPropsRegistry_->remove(tag);
    removedTags.push_back(tag);
    return true;
  });
  return removedTags;
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

std::optional<folly::dynamic> UpdatesRegistryManager::getRegistryProp(const Tag viewTag, const char *propName) const {
  react_native_assert(isLockedByCurrentThread());
  for (auto registry = registries_.rbegin(); registry != registries_.rend(); ++registry) {
    if (auto value = (*registry)->getProp(viewTag, propName)) {
      return value;
    }
  }
  return std::nullopt;
}

#ifdef ANDROID

void UpdatesRegistryManager::mergeRegistryProps(
    const Tag viewTag,
    folly::dynamic &target,
    const PropNamePredicate isIncluded) {
  react_native_assert(isLockedByCurrentThread());
  for (const auto &registry : registries_) {
    registry->mergeInto(viewTag, target, isIncluded);
  }
}

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
    auto propsVector = std::vector<folly::dynamic>{};
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
