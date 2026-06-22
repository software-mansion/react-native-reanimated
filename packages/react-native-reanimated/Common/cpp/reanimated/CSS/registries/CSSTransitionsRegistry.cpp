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
  const auto &transition = getOrCreateTransition(shadowNode);
  auto initialUpdate = transition->run(rt, std::move(config), getUpdatesFromRegistry(transition->getViewTag()));
  recordInitialUpdate(transition, initialUpdate);
}

void CSSTransitionsRegistry::run(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const PropertyValueDynamicDiffsMap &propertyDiffs) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto &transition = getOrCreateTransition(shadowNode);
  auto initialUpdate = transition->run(propertyDiffs, getUpdatesFromRegistry(transition->getViewTag()));
  recordInitialUpdate(transition, initialUpdate);
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
    const auto updates = transition->computeCurrentLoopStyle();
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
    const auto updates = transition->computeCurrentLoopStyle();
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
    it->second->cancel();
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

const std::shared_ptr<CSSTransition> &CSSTransitionsRegistry::getOrCreateTransition(
    const std::shared_ptr<const ShadowNode> &shadowNode) {
  const auto viewTag = shadowNode->getTag();
  if (!registry_.contains(viewTag)) {
    registry_.emplace(
        viewTag,
        std::make_shared<CSSTransition>(
            shadowNode, viewStylesRepository_, platformTransitionProxy_, loop_, transitionObserver_));
  }
  return registry_.at(viewTag);
}

void CSSTransitionsRegistry::recordInitialUpdate(
    const std::shared_ptr<CSSTransition> &transition,
    const folly::dynamic &initialUpdate) {
  if (initialUpdate.empty()) {
    return;
  }
  updateInUpdatesRegistry(transition, initialUpdate);
  updatedTags_.insert(transition->getViewTag());
}

} // namespace reanimated::css
