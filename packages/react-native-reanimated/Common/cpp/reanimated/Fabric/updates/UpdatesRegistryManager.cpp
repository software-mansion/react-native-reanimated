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
  removableShadowNodes_[shadowNode->getTag()] = shadowNode->getFamilyShared();
}

void UpdatesRegistryManager::unmarkNodeAsRemovable(Tag viewTag) {
  react_native_assert(isLockedByCurrentThread());
  removableShadowNodes_.erase(viewTag);
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
        registry->remove(tag);
      }
      staticPropsRegistry_->remove(tag);
      removePendingSynchronousProps(*shadowNodeFamily);
    } else {
      remainingShadowNodes.emplace(tag, shadowNodeFamily);
    }
  }

  removableShadowNodes_ = std::move(remainingShadowNodes);
}

PropsMap UpdatesRegistryManager::collectProps() {
  react_native_assert(isLockedByCurrentThread());
  PropsMap propsMap;
  for (auto &registry : registries_) {
    registry->collectProps(propsMap);
  }
  return propsMap;
}

void UpdatesRegistryManager::recordSynchronousProps(const UpdatesBatch &updatesBatch) {
  react_native_assert(isLockedByCurrentThread());
  for (const auto &[family, props] : updatesBatch) {
    auto &surface = pendingSynchronousProps_[family->getSurfaceId()];
    surface.version = ++pendingSynchronousPropsVersion_;
    auto &entry = surface.updates[family->getTag()];
    entry.family = family;
    for (const auto &[key, value] : props.items()) {
      entry.props[key] = value;
      entry.versions[key.getString()] = surface.version;
    }
  }
}

void UpdatesRegistryManager::alwaysCarryPendingPropsFor(std::function<bool(Tag)> predicate) {
  alwaysCarryPendingPropsFor_ = std::move(predicate);
}

bool UpdatesRegistryManager::alwaysCarriesPendingProps(const Tag tag) const {
  return alwaysCarryPendingPropsFor_ && alwaysCarryPendingPropsFor_(tag);
}

namespace {

using AncestorChains = std::unordered_map<Tag, ShadowNodeFamily::AncestorList>;

/// Nodes a Reanimated commit inspects below its batch before it falls back
/// to one ancestor walk per pending family.
constexpr size_t kPendingDescendantsVisitBudget = 1024;

bool hasAncestorIn(const PropsMap &propsMap, const ShadowNodeFamily::AncestorList &ancestors) {
  for (const auto &[ancestor, index] : ancestors) {
    if (propsMap.contains(ancestor.get().getFamilyShared())) {
      return true;
    }
  }
  return false;
}

std::vector<RawProps> withPendingPropsFirst(const folly::dynamic &pendingProps, const std::vector<RawProps> &props) {
  std::vector<RawProps> values;
  values.reserve(props.size() + 1);
  values.emplace_back(pendingProps);
  for (const auto &rawProps : props) {
    values.emplace_back(rawProps);
  }
  return values;
}

/// Follows the node's chain in `newRoot` and looks up the same positions in
/// `oldRoot`. An identical node object ends the walk: nothing below it
/// changed. A different family, or new props on the way down, means the
/// node has a new place or new props.
bool hasNewPropsOrPlace(const RootShadowNode &oldRoot, const ShadowNodeFamily::AncestorList &newAncestors) {
  const ShadowNode *oldNode = &oldRoot;
  for (const auto &[newParent, index] : newAncestors) {
    const auto &oldChildren = oldNode->getChildren();
    if (static_cast<size_t>(index) >= oldChildren.size()) {
      return true;
    }
    const auto &oldChild = oldChildren[index];
    const auto &newChild = newParent.get().getChildren()[index];
    if (oldChild == newChild) {
      return false;
    }
    if (&oldChild->getFamily() != &newChild->getFamily() || oldChild->getProps() != newChild->getProps()) {
      return true;
    }
    oldNode = oldChild.get();
  }
  return false;
}

} // namespace

void UpdatesRegistryManager::attachPendingSynchronousProps(
    PropsMap &propsMap,
    const RootShadowNode &oldRoot,
    const bool includeUntouchedFamilies) {
  react_native_assert(isLockedByCurrentThread());
  const auto it = pendingSynchronousProps_.find(oldRoot.getSurfaceId());
  if (it == pendingSynchronousProps_.end()) {
    return;
  }
  const auto &updates = it->second.updates;
  for (const auto &[tag, entry] : updates) {
    const auto propsIt = propsMap.find(entry.family);
    if (propsIt != propsMap.end()) {
      propsIt->second = withPendingPropsFirst(entry.props, propsIt->second);
    } else if (includeUntouchedFamilies || alwaysCarriesPendingProps(tag)) {
      propsMap[entry.family].emplace_back(RawProps(entry.props));
    }
  }
  if (includeUntouchedFamilies) {
    return;
  }
  size_t remaining = 0;
  for (const auto &[tag, entry] : updates) {
    remaining += propsMap.contains(entry.family) ? 0 : 1;
  }
  std::vector<ShadowNodeFamily::Shared> carriedFamilies;
  carriedFamilies.reserve(propsMap.size());
  for (const auto &[family, props] : propsMap) {
    carriedFamilies.push_back(family);
  }
  size_t budget = kPendingDescendantsVisitBudget;
  for (const auto &family : carriedFamilies) {
    if (remaining == 0 || budget == 0) {
      break;
    }
    const auto ancestors = family->getAncestors(oldRoot);
    if (ancestors.empty() || hasAncestorIn(propsMap, ancestors)) {
      continue;
    }
    const auto &[parent, index] = ancestors.back();
    attachPendingDescendants(propsMap, updates, *parent.get().getChildren()[index], budget, remaining);
  }
  if (remaining == 0 || budget > 0) {
    return;
  }
  for (const auto &[tag, entry] : updates) {
    if (!propsMap.contains(entry.family) && hasAncestorIn(propsMap, entry.family->getAncestors(oldRoot))) {
      propsMap[entry.family].emplace_back(RawProps(entry.props));
    }
  }
}

void UpdatesRegistryManager::attachPendingDescendants(
    PropsMap &propsMap,
    const std::unordered_map<Tag, PendingSynchronousProps> &updates,
    const ShadowNode &node,
    size_t &budget,
    size_t &remaining) {
  for (const auto &child : node.getChildren()) {
    if (remaining == 0 || budget == 0) {
      return;
    }
    --budget;
    const auto entryIt = updates.find(child->getTag());
    if (entryIt != updates.end() && !propsMap.contains(entryIt->second.family)) {
      propsMap[entryIt->second.family].emplace_back(RawProps(entryIt->second.props));
      --remaining;
    }
    attachPendingDescendants(propsMap, updates, *child, budget, remaining);
  }
}

void UpdatesRegistryManager::collectPendingSynchronousPropsForChangedNodes(
    PropsMap &propsMap,
    const RootShadowNode &oldRoot,
    const RootShadowNode &newRoot) {
  react_native_assert(isLockedByCurrentThread());
  const auto it = pendingSynchronousProps_.find(newRoot.getSurfaceId());
  if (it == pendingSynchronousProps_.end()) {
    return;
  }
  AncestorChains unchangedChains;
  for (const auto &[tag, entry] : it->second.updates) {
    auto newAncestors = entry.family->getAncestors(newRoot);
    if (newAncestors.empty()) {
      continue;
    }
    if (alwaysCarriesPendingProps(tag) || hasNewPropsOrPlace(oldRoot, newAncestors)) {
      propsMap[entry.family].emplace_back(RawProps(entry.props));
    } else {
      unchangedChains.emplace(tag, std::move(newAncestors));
    }
  }
  for (const auto &[tag, chain] : unchangedChains) {
    const auto &entry = it->second.updates.at(tag);
    if (hasAncestorIn(propsMap, chain)) {
      propsMap[entry.family].emplace_back(RawProps(entry.props));
    }
  }
}

void UpdatesRegistryManager::clearPendingSynchronousProps(
    const SurfaceId surfaceId,
    const PropsMap &carriedProps,
    const uint64_t committedVersion) {
  react_native_assert(isLockedByCurrentThread());
  const auto surfaceIt = pendingSynchronousProps_.find(surfaceId);
  if (surfaceIt == pendingSynchronousProps_.end()) {
    return;
  }
  auto &surface = surfaceIt->second;
  bool removed = false;
  for (auto &[tag, entry] : surface.updates) {
    if (!carriedProps.contains(entry.family)) {
      continue;
    }
    for (auto versionIt = entry.versions.begin(); versionIt != entry.versions.end();) {
      if (versionIt->second > committedVersion) {
        ++versionIt;
        continue;
      }
      entry.props.erase(versionIt->first);
      versionIt = entry.versions.erase(versionIt);
      removed = true;
    }
  }
  std::erase_if(surface.updates, [](const auto &entry) { return entry.second.props.empty(); });
  if (surface.updates.empty()) {
    pendingSynchronousProps_.erase(surfaceIt);
  } else if (removed) {
    surface.version = ++pendingSynchronousPropsVersion_;
  }
}

uint64_t UpdatesRegistryManager::pendingSynchronousPropsVersion(const SurfaceId surfaceId) const {
  react_native_assert(isLockedByCurrentThread());
  const auto it = pendingSynchronousProps_.find(surfaceId);
  return it == pendingSynchronousProps_.end() ? 0 : it->second.version;
}

std::unordered_set<SurfaceId> UpdatesRegistryManager::pendingSynchronousSurfaces() const {
  react_native_assert(isLockedByCurrentThread());
  std::unordered_set<SurfaceId> surfaces;
  for (const auto &[surfaceId, surface] : pendingSynchronousProps_) {
    surfaces.insert(surfaceId);
  }
  return surfaces;
}

bool UpdatesRegistryManager::hasPendingSynchronousProps(const Tag tag) const {
  react_native_assert(isLockedByCurrentThread());
  for (const auto &[surfaceId, surface] : pendingSynchronousProps_) {
    if (surface.updates.contains(tag)) {
      return true;
    }
  }
  return false;
}

void UpdatesRegistryManager::clearPendingSynchronousProps(const Tag tag, const folly::dynamic &props) {
  react_native_assert(isLockedByCurrentThread());
  if (!props.isObject()) {
    return;
  }
  for (auto surfaceIt = pendingSynchronousProps_.begin(); surfaceIt != pendingSynchronousProps_.end(); ++surfaceIt) {
    auto &surface = surfaceIt->second;
    const auto it = surface.updates.find(tag);
    if (it == surface.updates.end()) {
      continue;
    }
    bool changed = false;
    for (const auto &[key, value] : props.items()) {
      const auto *pendingValue = it->second.props.get_ptr(key);
      if (pendingValue != nullptr && *pendingValue == value) {
        it->second.props.erase(key.asString());
        it->second.versions.erase(key.asString());
        changed = true;
      }
    }
    if (!changed) {
      return;
    }
    surface.version = ++pendingSynchronousPropsVersion_;
    if (it->second.props.empty()) {
      surface.updates.erase(it);
    }
    if (surface.updates.empty()) {
      pendingSynchronousProps_.erase(surfaceIt);
    }
    return;
  }
}

bool UpdatesRegistryManager::recordReactCommit(const RootShadowNode::Shared &root, const PropsMap &propsMap) {
  react_native_assert(isLockedByCurrentThread());
  const auto surfaceId = root->getSurfaceId();
  const auto surfaceIt = pendingSynchronousProps_.find(surfaceId);
  if (surfaceIt == pendingSynchronousProps_.end()) {
    return pendingSynchronousProps_.empty();
  }

  auto &surface = surfaceIt->second;
  bool carriesAllPendingProps = pendingSynchronousProps_.size() == 1;
  for (auto &[tag, entry] : surface.updates) {
    std::erase_if(entry.reactCommits, [](const auto &receipt) { return receipt.props.expired(); });
    const auto ancestors = entry.family->getAncestors(*root);
    if (ancestors.empty()) {
      continue;
    }
    const auto propsIt = propsMap.find(entry.family);
    if (propsIt == propsMap.end()) {
      carriesAllPendingProps = false;
      continue;
    }
    const auto &[parent, index] = ancestors.back();
    const auto &props = parent.get().getChildren()[index]->getProps();
    ReactCommitReceipt receipt{props, surface.version, {}};
    for (const auto &rawProps : propsIt->second) {
      const auto values = static_cast<folly::dynamic>(rawProps);
      for (const auto &key : values.keys()) {
        if (entry.props.count(key) > 0) {
          receipt.keys.insert(key.asString());
        }
      }
    }
    carriesAllPendingProps &= receipt.keys.size() == entry.props.size();
    if (!receipt.keys.empty()) {
      entry.reactCommits.push_back(std::move(receipt));
      surface.hasReactCommits = true;
    }
  }
  return carriesAllPendingProps;
}

void UpdatesRegistryManager::acknowledgeReactCommit(const RootShadowNode &root) {
  react_native_assert(isLockedByCurrentThread());
  const auto surfaceIt = pendingSynchronousProps_.find(root.getSurfaceId());
  if (surfaceIt == pendingSynchronousProps_.end() || !surfaceIt->second.hasReactCommits) {
    return;
  }
  auto &surface = surfaceIt->second;
  surface.hasReactCommits = false;
  bool changed = false;
  for (auto &[tag, entry] : surface.updates) {
    if (entry.reactCommits.empty()) {
      continue;
    }
    const auto ancestors = entry.family->getAncestors(root);
    if (ancestors.empty()) {
      surface.hasReactCommits = true;
      continue;
    }
    const auto &[parent, index] = ancestors.back();
    const auto &props = parent.get().getChildren()[index]->getProps();
    for (auto receiptIt = entry.reactCommits.begin(); receiptIt != entry.reactCommits.end();) {
      const auto committedProps = receiptIt->props.lock();
      if (!committedProps) {
        receiptIt = entry.reactCommits.erase(receiptIt);
        continue;
      }
      if (committedProps != props) {
        ++receiptIt;
        continue;
      }
      for (const auto &key : receiptIt->keys) {
        const auto versionIt = entry.versions.find(key);
        if (versionIt != entry.versions.end() && versionIt->second <= receiptIt->version) {
          entry.versions.erase(versionIt);
          entry.props.erase(key);
          changed = true;
        }
      }
      receiptIt = entry.reactCommits.erase(receiptIt);
    }
    surface.hasReactCommits |= !entry.reactCommits.empty();
  }
  std::erase_if(surface.updates, [](const auto &entry) { return entry.second.props.empty(); });
  if (surface.updates.empty()) {
    pendingSynchronousProps_.erase(surfaceIt);
  } else if (changed) {
    surface.version = ++pendingSynchronousPropsVersion_;
  }
}

void UpdatesRegistryManager::removeSurface(const SurfaceId surfaceId) {
  react_native_assert(isLockedByCurrentThread());
  pendingSynchronousProps_.erase(surfaceId);
}

void UpdatesRegistryManager::removePendingSynchronousProps(const ShadowNodeFamily &family) {
  const auto it = pendingSynchronousProps_.find(family.getSurfaceId());
  if (it == pendingSynchronousProps_.end() || it->second.updates.erase(family.getTag()) == 0) {
    return;
  }
  if (it->second.updates.empty()) {
    pendingSynchronousProps_.erase(it);
  } else {
    it->second.version = ++pendingSynchronousPropsVersion_;
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
