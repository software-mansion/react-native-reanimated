#include <reanimated/CSS/registries/CSSTransitionsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

#include <react/debug/react_native_assert.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::shared_ptr<OperationsLoop> &loop,
    const std::shared_ptr<CSSPlatformTransitionProxy> &platformTransitionProxy,
    const std::shared_ptr<CSSEventsEmitter> &eventsEmitter)
    : viewStylesRepository_(viewStylesRepository),
      loop_(loop),
      platformTransitionProxy_(platformTransitionProxy),
      eventsEmitter_(eventsEmitter) {}

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

void CSSTransitionsRegistry::setEventMask(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const CSSEventMask eventMask) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  getOrCreateTransition(shadowNode)->setEventMask(eventMask);
}

void CSSTransitionsRegistry::run(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const PropertyValueDynamicDiffsMap &propertyDiffs) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto &transition = getOrCreateTransition(shadowNode);
  auto initialUpdate = transition->run(propertyDiffs, getUpdatesFromRegistry(transition->getViewTag()));
  recordInitialUpdate(transition, initialUpdate);
}

void CSSTransitionsRegistry::setPseudoLockedProperties(const Tag viewTag, const TransitionProperties &properties) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto it = registry_.find(viewTag);
  if (it != registry_.end()) {
    it->second->setPseudoLockedProperties(properties);
  }
}

void CSSTransitionsRegistry::reconcilePseudoStyledProperties(
    const Tag viewTag,
    const folly::dynamic &defaults,
    const folly::dynamic &previousDefaults,
    const TransitionProperties &lockedProperties) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto it = registry_.find(viewTag);
  if (it == registry_.end()) {
    return;
  }
  auto updates = getUpdatesFromRegistry(viewTag);
  if (updates.isNull() || updates.empty()) {
    return;
  }

  const auto &transition = it->second;
  const auto shadowNode = transition->getShadowNode();
  PropertyValueDynamicDiffsMap corrections;
  std::vector<std::string> evictedProperties;

  for (const auto &[propKey, freshValue] : defaults.items()) {
    const auto propName = propKey.asString();
    if (lockedProperties.contains(propName) || updates.count(propName) == 0) {
      continue;
    }
    if (freshValue.isNull()) {
      // Styled only by the selector, so the resting value is whatever React renders.
      updates.erase(propName);
      evictedProperties.push_back(propName);
    } else if (updates[propName] != freshValue) {
      corrections.emplace(propName, std::make_pair(updates[propName], freshValue));
    }
  }

  // A property can leave the pseudo block while its selector stays, which does not unregister
  // the tag and leaves it out of the defaults above.
  if (previousDefaults.isObject()) {
    for (const auto &propKey : previousDefaults.keys()) {
      const auto propName = propKey.asString();
      if (defaults.count(propName) != 0 || lockedProperties.contains(propName) || updates.count(propName) == 0) {
        continue;
      }
      updates.erase(propName);
      evictedProperties.push_back(propName);
    }
  }

  if (!evictedProperties.empty()) {
    // An in-flight transition would otherwise re-emit the evicted value on its next tick and
    // pin the property again.
    transition->removeProperties(evictedProperties, loop_->resolveTimestamp());
    setInUpdatesRegistry(transition->getShadowNodeFamily(), updates);
  }
  if (!corrections.empty()) {
    run(shadowNode, corrections);
  }
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
    const auto updates = transition->takeUpdates();
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
    const auto updates = transition->takeUpdates();
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

void CSSTransitionsRegistry::TransitionObserver::onTransitionEvent(
    const Tag viewTag,
    const std::string &propertyName,
    const CSSEventType type,
    const double elapsedTimeMs) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  owner_.eventsEmitter_->emit(createCSSEvent(viewTag, type, propertyName, elapsedTimeMs));
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
  if (updates.empty() && lastUpdates.empty()) {
    return;
  }
  const auto &transitionProperties = transition->getLoopProperties();

  folly::dynamic filteredUpdates = folly::dynamic::object;

  if (!lastUpdates.empty()) {
    for (const auto &prop : transitionProperties) {
      if (lastUpdates.count(prop)) {
        filteredUpdates[prop] = lastUpdates[prop];
      }
    }
  }

  // updated object contains only allowed properties so we don't need
  // to do additional filtering here
  filteredUpdates.update(updates);
  if (filteredUpdates.empty()) {
    removeFromUpdatesRegistry(shadowNode->getTag());
  } else {
    setInUpdatesRegistry(shadowNode->getFamilyShared(), filteredUpdates);
  }
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
  // Filter even with no new updates: a run that moved a property off the loop
  // must evict its retained value, which the commit hook would keep re-injecting.
  updateInUpdatesRegistry(transition, initialUpdate);
  if (!initialUpdate.empty()) {
    updatedTags_.insert(transition->getViewTag());
  }
}

} // namespace reanimated::css
