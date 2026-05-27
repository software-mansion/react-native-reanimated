#include <reanimated/CSS/registries/CSSTransitionsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

#include <react/debug/react_native_assert.h>

#include <memory>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::shared_ptr<OperationsLoop> &loop,
    const std::shared_ptr<CSSPlatformTransitionProxy> &platformTransitionProxy)
    : viewStylesRepository_(viewStylesRepository), loop_(loop), platformTransitionProxy_(platformTransitionProxy) {}

bool CSSTransitionsRegistry::needsFlush() const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  return !updatedTags_.empty();
}

void CSSTransitionsRegistry::updateConfigOrRun(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    CSSTransitionConfig &&config) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto viewTag = shadowNode->getTag();

  if (!registry_.contains(viewTag)) {
    auto transition = std::make_shared<CSSTransition>(
        shadowNode, viewStylesRepository_, transitionObserver_, platformTransitionProxy_);
    registry_.insert({viewTag, transition});
  }

  const auto &transition = registry_.at(viewTag);

  // Split via the platform proxy: platform-routed props are handled inside
  // CSSTransition::splitForPlatformRouting; the returned config carries only
  // the loop-side settings + value diffs + removals.
  auto loopConfig = transition->splitForPlatformRouting(rt, std::move(config), loop_->resolveTimestamp());

  if (loopConfig.changedPropertiesSettings.size() || loopConfig.removedProperties.size()) {
    transition->updateSettings(loopConfig.changedPropertiesSettings, loopConfig.removedProperties);
  }
  if (loopConfig.changedProperties.size()) {
    runTransition(rt, transition, viewTag, loopConfig.changedProperties);
  }
}

void CSSTransitionsRegistry::run(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const PropertyValueDiffsMap &propertyDiffs) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto viewTag = shadowNode->getTag();
  const auto &transition = registry_.at(viewTag);

  runTransition(rt, transition, viewTag, propertyDiffs);
}

void CSSTransitionsRegistry::run(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const PropertyValueDynamicDiffsMap &propertyDiffs) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto viewTag = shadowNode->getTag();
  const auto &transition = registry_.at(viewTag);

  const auto &lastUpdates = getUpdatesFromRegistry(viewTag);
  const auto timestamp = loop_->resolveTimestamp();

  auto initialUpdate = transition->run(propertyDiffs, lastUpdates, timestamp);

  transition->schedule(*loop_);
  updateInUpdatesRegistry(transition, initialUpdate);
  updatedTags_.insert(viewTag);
}

void CSSTransitionsRegistry::flushUpdates(UpdatesBatch &updatesBatch) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto tags = std::exchange(updatedTags_, {});
  for (const auto viewTag : tags) {
    const auto it = registry_.find(viewTag);
    if (it == registry_.end()) {
      continue;
    }

    auto &transition = it->second;
    const auto updates = transition->computeCurrentStyle();

    if (!updates.empty()) {
      addUpdatesToBatch(transition->getShadowNodeFamily(), updates);
    }
  }

  flush(updatesBatch);
}

#if REACT_NATIVE_VERSION_MINOR >= 85
void CSSTransitionsRegistry::flushUpdates(UpdatesBatchAnimatedProps &updatesBatch) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto tags = std::exchange(updatedTags_, {});
  for (const auto viewTag : tags) {
    const auto it = registry_.find(viewTag);
    if (it == registry_.end()) {
      continue;
    }

    auto &transition = it->second;
    const auto updates = transition->computeCurrentStyle();

    if (!updates.empty()) {
      addRawPropsToAnimatedPropsBatch(transition->getShadowNodeFamily(), updates);
      // Legacy flushes merge each frame into the updates registry; animated-props flushes do not.
      // Keep the registry current so the next transition reads a real "from" value, not the first frame only.
      updateInUpdatesRegistry(transition, updates);
    }
  }

  flush(updatesBatch);
}
#endif

CSSTransitionsRegistry::TransitionObserver::TransitionObserver(CSSTransitionsRegistry &owner) : owner_(owner) {}

void CSSTransitionsRegistry::TransitionObserver::onTransitionUpdate(const Tag viewTag) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  owner_.updatedTags_.insert(viewTag);
}

void CSSTransitionsRegistry::removeTag(const Tag viewTag) {
  const auto it = registry_.find(viewTag);
  if (it != registry_.end()) {
    it->second->unschedule(*loop_);
  }
  removeFromUpdatesRegistry(viewTag);
  registry_.erase(viewTag);
}

void CSSTransitionsRegistry::updateInUpdatesRegistry(
    const std::shared_ptr<CSSTransition> &transition,
    const folly::dynamic &updates) {
  const auto &shadowNode = transition->getShadowNode();
  const auto &lastUpdates = getUpdatesFromRegistry(shadowNode->getTag());
  const auto &transitionProperties = transition->getProperties();

  folly::dynamic filteredUpdates = folly::dynamic::object;

  if (!lastUpdates.empty()) {
    // Otherwise, we keep only allowed properties from the last updates
    // and update the object with the new transition starting values
    for (const auto &prop : transitionProperties) {
      if (lastUpdates.count(prop)) {
        filteredUpdates[prop] = lastUpdates[prop];
      }
    }
  }

  // updated object contains only allowed properties so we don't need
  // to do additional filtering here
  filteredUpdates.update(updates);
  setInUpdatesRegistry(shadowNode->getFamilyShared(), filteredUpdates);
}

void CSSTransitionsRegistry::runTransition(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSTransition> &transition,
    const facebook::react::Tag &viewTag,
    const PropertyValueDiffsMap &propertyDiffs) {
  const auto &lastUpdates = getUpdatesFromRegistry(viewTag);
  const auto timestamp = loop_->resolveTimestamp();

  auto initialUpdate = transition->run(rt, propertyDiffs, lastUpdates, timestamp);

  transition->schedule(*loop_);
  updateInUpdatesRegistry(transition, initialUpdate);
  updatedTags_.insert(viewTag);
}

} // namespace reanimated::css
