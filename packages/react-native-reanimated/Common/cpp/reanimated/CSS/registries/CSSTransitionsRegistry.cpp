#include <reanimated/CSS/registries/CSSTransitionsRegistry.h>
#include <reanimated/Tools/FeatureFlags.h>

#include <memory>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const GetAnimationTimestampFunction &getCurrentTimestamp,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : getCurrentTimestamp_(getCurrentTimestamp), viewStylesRepository_(viewStylesRepository) {}

bool CSSTransitionsRegistry::isEmpty() const {
  std::lock_guard<std::mutex> lock{mutex_};
  // The registry is empty if has no registered animations and no updates
  // stored in the updates registry
  return updatesRegistry_.empty() && registry_.empty();
}

bool CSSTransitionsRegistry::hasUpdates() const {
  std::lock_guard<std::mutex> lock{mutex_};
  return !runningTransitionTags_.empty() || !delayedTransitionsManager_.empty();
}

void CSSTransitionsRegistry::updateConfigOrRun(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const CSSTransitionConfig &config) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto viewTag = shadowNode->getTag();

  if (!registry_.contains(viewTag)) {
    // Create new transition
    auto transition = std::make_shared<CSSTransition>(shadowNode, viewStylesRepository_);
    registry_.insert({viewTag, transition});
  }

  const auto &transition = registry_.at(viewTag);

  if (config.changedPropertiesSettings.size() || config.removedProperties.size()) {
    transition->updateConfig(config.changedPropertiesSettings, config.removedProperties);
  }
  if (config.changedProperties.size()) {
    runTransition(rt, transition, viewTag, config.changedProperties);
  }
}

void CSSTransitionsRegistry::run(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const PropertyValueDiffsMap &propertyDiffs) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto viewTag = shadowNode->getTag();
  const auto &transition = registry_.at(viewTag);

  runTransition(rt, transition, viewTag, propertyDiffs);
}

void CSSTransitionsRegistry::run(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const PropertyValueDynamicDiffsMap &propertyDiffs) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto viewTag = shadowNode->getTag();
  const auto &transition = registry_.at(viewTag);

  const auto &lastUpdates = getUpdatesFromRegistry(viewTag);
  const auto timestamp = getCurrentTimestamp_();

  auto initialUpdate = transition->run(propertyDiffs, lastUpdates, timestamp);

  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
    if (!initialUpdate.empty()) {
#if REACT_NATIVE_VERSION_MINOR >= 85
      addRawPropsToAnimatedPropsBatch(transition->getShadowNode()->getFamilyShared(), std::move(initialUpdate));
#endif
    }
  }

  scheduleOrActivateTransition(transition);
  updateInUpdatesRegistry(transition, initialUpdate);
}

void CSSTransitionsRegistry::removeTag(const Tag viewTag) {
  removeFromUpdatesRegistry(viewTag);
  delayedTransitionsManager_.remove(viewTag);
  runningTransitionTags_.erase(viewTag);
  registry_.erase(viewTag);
}

void CSSTransitionsRegistry::update(const double timestamp) {
  // Activate all delayed transitions that should start now
  activateDelayedTransitions(timestamp);

  // Iterate over active transitions and update them
  for (auto it = runningTransitionTags_.begin(); it != runningTransitionTags_.end();) {
    const auto &viewTag = *it;
    const auto &transition = registry_[viewTag];

    const folly::dynamic &updates = transition->update(timestamp);
    if (!updates.empty()) {
      if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
#if REACT_NATIVE_VERSION_MINOR >= 85
        addRawPropsToAnimatedPropsBatch(transition->getShadowNode()->getFamilyShared(), updates);
        // Legacy flushes merge each frame into the updates registry; animated-props flushes do not.
        // Keep the registry current so the next transition reads a real "from" value, not the first frame only.
        updateInUpdatesRegistry(transition, updates);
#endif
      } else {
        addUpdatesToBatch(transition->getShadowNode()->getFamilyShared(), updates);
      }
    }

    // We remove transition from running and schedule it when animation of one
    // of properties has finished and the other one is still delayed
    const auto &minDelay = transition->getMinDelay(timestamp);
    if (minDelay > 0) {
      delayedTransitionsManager_.add(timestamp + transition->getMinDelay(timestamp), viewTag);
    }

    if (transition->getState() != TransitionProgressState::Running) {
      it = runningTransitionTags_.erase(it);
    } else {
      ++it;
    }
  }
}

void CSSTransitionsRegistry::activateDelayedTransitions(const double timestamp) {
  while (!delayedTransitionsManager_.empty() && delayedTransitionsManager_.top().timestamp <= timestamp) {
    const auto [_, viewTag] = delayedTransitionsManager_.pop();

    // Add only these transitions which weren't removed in the meantime
    if (registry_.find(viewTag) != registry_.end()) {
      runningTransitionTags_.insert(viewTag);
    }
  }
}

void CSSTransitionsRegistry::scheduleOrActivateTransition(const std::shared_ptr<CSSTransition> &transition) {
  const auto viewTag = transition->getViewTag();
  const auto currentTimestamp = getCurrentTimestamp_();
  const auto minDelay = transition->getMinDelay(currentTimestamp);

  // Remove transition from delayed (if it is already added to delayed
  // transitions)
  delayedTransitionsManager_.remove(viewTag);

  if (minDelay > 0) {
    delayedTransitionsManager_.add(currentTimestamp + minDelay, viewTag);
  } else {
    runningTransitionTags_.insert(viewTag);
  }
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
  const auto timestamp = getCurrentTimestamp_();

  auto initialUpdate = transition->run(rt, propertyDiffs, lastUpdates, timestamp);

  scheduleOrActivateTransition(transition);
  updateInUpdatesRegistry(transition, initialUpdate);
}

} // namespace reanimated::css
