#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <reanimated/Fabric/updates/PropsLayoutFilter.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

#include <react/debug/react_native_assert.h>

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

void UpdatesRegistry::remove(const Tag tag) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  removeTag(tag);
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

#if REACT_NATIVE_VERSION_MINOR >= 85
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

void UpdatesRegistry::flushNonLayoutUpdates(jsi::Runtime &rt, AnimationMutations &mutations) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  UpdatesBatchAnimatedProps remaining;

  for (auto &[shadowNodeFamily, animatedProp, _hasLayout] : updatesBatchAnimatedProps_) {
    // Split typed props by layout vs non-layout.
    std::vector<std::unique_ptr<AnimatedPropBase>> nonLayoutTypedProps;
    std::vector<std::unique_ptr<AnimatedPropBase>> layoutTypedProps;
    for (auto &prop : animatedProp.props) {
      if (isLayoutProp(prop->propName)) {
        layoutTypedProps.push_back(std::move(prop));
      } else {
        nonLayoutTypedProps.push_back(std::move(prop));
      }
    }

    // Split rawProps by layout vs non-layout.
    std::unique_ptr<RawProps> nonLayoutRawProps;
    std::unique_ptr<RawProps> layoutRawProps;
    if (animatedProp.rawProps) {
      auto propsDyn = animatedProp.rawProps->toDynamic();
      folly::dynamic nonLayoutDyn = folly::dynamic::object();
      folly::dynamic layoutDyn = folly::dynamic::object();
      for (const auto &key : propsDyn.keys()) {
        const auto keyStr = key.asString();
        const auto propName = propNameFromString(keyStr);
        if (propName.has_value() && isLayoutProp(propName.value())) {
          layoutDyn[keyStr] = propsDyn[key];
        } else {
          nonLayoutDyn[keyStr] = propsDyn[key];
        }
      }
      if (!nonLayoutDyn.empty()) {
        nonLayoutRawProps = std::make_unique<RawProps>(rt, jsi::valueFromDynamic(rt, nonLayoutDyn));
      }
      if (!layoutDyn.empty()) {
        layoutRawProps = std::make_unique<RawProps>(rt, jsi::valueFromDynamic(rt, layoutDyn));
      }
    }

    // Non-layout part → apply now.
    if (!nonLayoutTypedProps.empty() || nonLayoutRawProps) {
      AnimatedProps nonLayoutProps{std::move(nonLayoutTypedProps), std::move(nonLayoutRawProps)};
      mutations.batch.push_back(
          AnimationMutation{shadowNodeFamily->getTag(), shadowNodeFamily, std::move(nonLayoutProps), false});
    }

    // Layout part → defer to next full flush.
    if (!layoutTypedProps.empty() || layoutRawProps) {
      AnimatedProps layoutProps{std::move(layoutTypedProps), std::move(layoutRawProps)};
      remaining.push_back(AnimatedPropsEntry{shadowNodeFamily, std::move(layoutProps), true});
    }
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
#endif

UpdatesBatch UpdatesRegistry::getPendingUpdates() {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  flushUpdatesToRegistry(updatesBatch_);

  UpdatesBatch updatesBatch;
  for (const auto &[tag, pair] : updatesRegistry_) {
    const auto &[shadowNodeFamily, props] = pair;
    updatesBatch.emplace_back(shadowNodeFamily, props);
  }
  return updatesBatch;
}

void UpdatesRegistry::collectProps(PropsMap &propsMap) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  auto copiedRegistry = updatesRegistry_;
  for (const auto &[tag, pair] : copiedRegistry) {
    const auto &[shadowNodeFamily, props] = pair;
    const auto it = propsMap.find(shadowNodeFamily);

    if (it == propsMap.cend()) {
      auto propsVector = std::vector<RawProps>{};
      propsVector.emplace_back(RawProps(props));
      propsMap.emplace(shadowNodeFamily, propsVector);
    } else {
      it->second.push_back(RawProps(props));
    }
  }
}

void UpdatesRegistry::addUpdatesToBatch(const ShadowNodeFamily::Shared &shadowNodeFamily, const folly::dynamic &props) {
  updatesBatch_.emplace_back(shadowNodeFamily, props);
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
