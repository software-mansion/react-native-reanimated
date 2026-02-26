#include <reanimated/CSS/registries/CSSTransitionsRegistry.h>

#include <memory>
#include <utility>

namespace reanimated::css {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const GetAnimationTimestampFunction &getCurrentTimestamp,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : getCurrentTimestamp_(getCurrentTimestamp), viewStylesRepository_(viewStylesRepository) {}

bool CSSTransitionsRegistry::isEmpty() const {
  // The registry is empty if has no registered animations and no updates
  // stored in the updates registry
  return UpdatesRegistry::isEmpty() && registry_.empty();
}

bool CSSTransitionsRegistry::hasUpdates() const {
  return !runningTransitionTags_.empty() || !delayedTransitionsManager_.empty();
}

void CSSTransitionsRegistry::run(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const CSSTransitionConfig &config) {
  const auto viewTag = shadowNode->getTag();

  if (!registry_.contains(viewTag)) {
    // Create new transition
    auto transition = std::make_shared<CSSTransition>(shadowNode, viewStylesRepository_);
    registry_.insert({viewTag, transition});
  }

  const auto &transition = registry_.at(viewTag);
  const auto &lastUpdates = getUpdatesFromRegistry(shadowNode->getTag());
  const auto timestamp = getCurrentTimestamp_();

  auto initialUpdate = transition->run(rt, config, lastUpdates, timestamp);

  scheduleOrActivateTransition(transition);
  updateInUpdatesRegistry(transition, initialUpdate);
}

void CSSTransitionsRegistry::remove(const Tag viewTag) {
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
      addUpdatesToBatch(transition->getShadowNode()->getFamilyShared(), updates);
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
  const auto family = shadowNode->getFamilyShared();
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
  setInUpdatesRegistry(family, filteredUpdates);
}

} // namespace reanimated::css
