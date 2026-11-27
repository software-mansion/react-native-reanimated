#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <reanimated/Fabric/updates/PropsLayoutFilter.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

#include <reanimated/Compat/ReactNativeDebug.h>

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

bool UpdatesRegistry::isEmpty() const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  return updatesRegistry_.empty();
}

folly::dynamic UpdatesRegistry::get(const Tag tag) const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  auto it = updatesRegistry_.find(tag);
  if (it == updatesRegistry_.cend()) {
    return nullptr;
  }
  return it->second.second;
}

void UpdatesRegistry::mergeInto(const Tag tag, folly::dynamic &target) const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  auto it = updatesRegistry_.find(tag);
  if (it == updatesRegistry_.cend()) {
    return;
  }
  target.update(it->second.second);
}

std::optional<folly::dynamic> UpdatesRegistry::getProp(const Tag tag, const char *propName) const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  auto it = updatesRegistry_.find(tag);
  if (it == updatesRegistry_.cend()) {
    return std::nullopt;
  }
  const auto *value = it->second.second.get_ptr(propName);
  if (!value) {
    return std::nullopt;
  }
  return *value;
}

#ifdef ANDROID
void UpdatesRegistry::mergeInto(const Tag tag, folly::dynamic &target, const PropNamePredicate isIncluded) const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  auto it = updatesRegistry_.find(tag);
  if (it == updatesRegistry_.cend()) {
    return;
  }
  for (const auto &[name, value] : it->second.second.items()) {
    if (isIncluded(name.getString())) {
      target[name] = value;
    }
  }
}
#endif // ANDROID

void UpdatesRegistry::remove(const Tag tag) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  removeTag(tag);
}

void UpdatesRegistry::removeUnmounted(const ShadowNodeFamily::Shared &shadowNodeFamily) {
  const auto tag = shadowNodeFamily->getTag();
  remove(tag);
  removePendingUpdates(tag);
}

void UpdatesRegistry::flushUpdates(UpdatesBatch &updatesBatch) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  flush(updatesBatch);
}

void UpdatesRegistry::flush(UpdatesBatch &updatesBatch) {
  auto copiedUpdatesBatch = std::move(updatesBatch_);
  updatesBatch_.clear();

  // Store all updates in the registry for later use in the commit hook
  flushUpdatesToRegistry(copiedUpdatesBatch);
  // Flush the updates to the updatesBatch used to apply current changes
  for (auto &[shadowNodeFamily, props] : copiedUpdatesBatch) {
    updatesBatch.emplace_back(shadowNodeFamily, std::move(props));
  }
}

void UpdatesRegistry::flushUpdates(UpdatesBatchAnimatedProps &updatesBatch) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  flush(updatesBatch);
}

void UpdatesRegistry::flush(UpdatesBatchAnimatedProps &updatesBatch) {
  auto copiedUpdatesBatch = std::move(updatesBatchAnimatedProps_);
  updatesBatchAnimatedProps_.clear();

  for (auto &entry : copiedUpdatesBatch) {
    updatesBatch.push_back(std::move(entry));
  }
}

void UpdatesRegistry::flushUpdatesWithoutLayout(UpdatesBatchAnimatedProps &updatesBatch) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  std::unordered_set<Tag> tagsWithLayoutUpdates;
  for (const auto &entry : updatesBatchAnimatedProps_) {
    if (entry.hasLayoutUpdates) {
      tagsWithLayoutUpdates.insert(entry.shadowNodeFamily->getTag());
    }
  }

  UpdatesBatchAnimatedProps remaining;
  for (auto &entry : updatesBatchAnimatedProps_) {
    const bool waitsForLayout = tagsWithLayoutUpdates.contains(entry.shadowNodeFamily->getTag());
    (waitsForLayout ? remaining : updatesBatch).push_back(std::move(entry));
  }
  updatesBatchAnimatedProps_ = std::move(remaining);
}

bool UpdatesRegistry::hasPendingAnimatedPropsUpdates() const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  return !updatesBatchAnimatedProps_.empty();
}

void UpdatesRegistry::addAnimatedPropsToBatch(
    const ShadowNodeFamily::Shared &shadowNodeFamily,
    AnimatedProps animatedProps,
    bool hasLayoutUpdates) {
  if (!hasLayoutUpdates) {
    for (const auto &prop : animatedProps.props) {
      if (isLayoutProp(prop->propName)) {
        hasLayoutUpdates = true;
        break;
      }
    }
  }
  updatesBatchAnimatedProps_.push_back(
      AnimatedPropsEntry{shadowNodeFamily, std::move(animatedProps), hasLayoutUpdates});
}

void UpdatesRegistry::addRawPropsToAnimatedPropsBatch(
    const ShadowNodeFamily::Shared &shadowNodeFamily,
    folly::dynamic props) {
  const bool hasLayoutUpdates = hasLayoutProps(props);
  animatedPropsBuilder_.storeDynamic(props);
  addAnimatedPropsToBatch(shadowNodeFamily, animatedPropsBuilder_.get(), hasLayoutUpdates);
}

void UpdatesRegistry::addJSIPropsToAnimatedPropsBatch(
    const ShadowNodeFamily::Shared &shadowNodeFamily,
    jsi::Runtime &rt,
    jsi::Value &props) {
  const bool hasLayoutUpdates = hasLayoutProps(rt, props);
  animatedPropsBuilder_.storeJSI(rt, props);
  addAnimatedPropsToBatch(shadowNodeFamily, animatedPropsBuilder_.get(), hasLayoutUpdates);
}

UpdatesBatch UpdatesRegistry::getPendingUpdates() {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  flushUpdatesToRegistry(updatesBatch_);

  // Only the views updated since the last flush, each once with its merged registry props.
  UpdatesBatch updatesBatch;
  std::unordered_set<Tag> collectedTags;
  for (const auto &[shadowNodeFamily, _] : updatesBatch_) {
    const auto tag = shadowNodeFamily->getTag();
    if (!collectedTags.insert(tag).second) {
      continue;
    }
    const auto it = updatesRegistry_.find(tag);
    if (it != updatesRegistry_.end()) {
      updatesBatch.emplace_back(it->second.first, it->second.second);
    }
  }
  return updatesBatch;
}

void UpdatesRegistry::collectProps(PropsMap &propsMap) const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  for (const auto &[tag, pair] : updatesRegistry_) {
    const auto &[shadowNodeFamily, props] = pair;
    propsMap[shadowNodeFamily].push_back(props);
  }
}

void UpdatesRegistry::addUpdatesToBatch(const ShadowNodeFamily::Shared &shadowNodeFamily, const folly::dynamic &props) {
  updatesBatch_.emplace_back(shadowNodeFamily, props);
}

void UpdatesRegistry::addUpdatesToBatch(const ShadowNodeFamily::Shared &shadowNodeFamily, folly::dynamic &&props) {
  updatesBatch_.emplace_back(shadowNodeFamily, std::move(props));
}

std::unordered_set<Tag> UpdatesRegistry::getPendingTags() const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  std::unordered_set<Tag> pendingTags;
  for (const auto &[shadowNodeFamily, _] : updatesBatch_) {
    pendingTags.insert(shadowNodeFamily->getTag());
  }
  return pendingTags;
}

void UpdatesRegistry::setInUpdatesRegistry(
    const ShadowNodeFamily::Shared &shadowNodeFamily,
    const folly::dynamic &props) {
  const auto tag = shadowNodeFamily->getTag();
#ifdef ANDROID
  updatePropsToRevert(tag, &props);
#endif
  updatesRegistry_[tag] = std::make_pair(shadowNodeFamily, props);
}

folly::dynamic UpdatesRegistry::getUpdatesFromRegistry(const Tag tag) const {
  auto it = updatesRegistry_.find(tag);
  if (it == updatesRegistry_.cend()) {
    return folly::dynamic();
  }
  return it->second.second;
}

void UpdatesRegistry::removeFromUpdatesRegistry(const Tag tag) {
#ifdef ANDROID
  updatePropsToRevert(tag);
#endif
  updatesRegistry_.erase(tag);
}

void UpdatesRegistry::removePendingUpdates(const Tag tag) {
  std::erase_if(updatesBatch_, [tag](const auto &update) { return update.first->getTag() == tag; });

  UpdatesBatchAnimatedProps remaining;
  remaining.reserve(updatesBatchAnimatedProps_.size());
  for (auto &entry : updatesBatchAnimatedProps_) {
    if (entry.shadowNodeFamily->getTag() != tag) {
      remaining.push_back(std::move(entry));
    }
  }
  updatesBatchAnimatedProps_ = std::move(remaining);
}

void UpdatesRegistry::flushUpdatesToRegistry(const UpdatesBatch &updatesBatch) {
  for (auto &[shadowNodeFamily, props] : updatesBatch) {
    const auto tag = shadowNodeFamily->getTag();
    auto it = updatesRegistry_.find(tag);

    if (it == updatesRegistry_.cend()) {
      updatesRegistry_[tag] = std::make_pair(shadowNodeFamily, props);
    } else {
      it->second.second.update(props);
    }
  }
}

#ifdef ANDROID

bool UpdatesRegistry::hasPropsToRevert() const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  return !propsToRevertMap_.empty();
}

void UpdatesRegistry::collectPropsToRevert(PropsToRevertMap &propsToRevertMap) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  for (const auto &[tag, pair] : propsToRevertMap_) {
    const auto &[shadowNodeFamily, props] = pair;
    const auto it = propsToRevertMap.find(tag);
    if (it == propsToRevertMap.end()) {
      propsToRevertMap[tag] = {shadowNodeFamily, props};
    } else {
      it->second.props.insert(props.begin(), props.end());
    }
  }

  propsToRevertMap_.clear();
}

void UpdatesRegistry::updatePropsToRevert(const Tag tag, const folly::dynamic *newProps) {
  auto it = updatesRegistry_.find(tag);
  if (it == updatesRegistry_.end()) {
    return;
  }

  const auto &shadowNodeFamily = it->second.first;
  const auto &registryProps = it->second.second;
  if (propsToRevertMap_.find(tag) == propsToRevertMap_.end()) {
    propsToRevertMap_[tag] = {shadowNodeFamily, std::unordered_set<std::string>()};
  }

  if (newProps == nullptr) {
    // If newProps is not provided, revert all props from registry
    for (const auto &propName : registryProps.keys()) {
      propsToRevertMap_[tag].props.emplace(propName.asString());
    }
  } else {
    // If newProps is provided, revert only props that are in registry but not
    // in newProps
    for (const auto &propName : registryProps.keys()) {
      if (newProps->find(propName) == newProps->items().end()) {
        propsToRevertMap_[tag].props.emplace(propName.asString());
      }
    }
  }

  if (propsToRevertMap_[tag].props.empty()) {
    propsToRevertMap_.erase(tag);
  }
}

#endif

} // namespace reanimated
