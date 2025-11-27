#include <reanimated/CSS/registries/CSSTransitionsRegistry.h>

#include <memory>
#include <utility>

namespace reanimated::css {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
    const GetAnimationTimestampFunction &getCurrentTimestamp)
    : getCurrentTimestamp_(getCurrentTimestamp) {}

bool CSSTransitionsRegistry::isEmpty() const {
  // The registry is empty if has no registered animations and no updates
  // stored in the updates registry
  return UpdatesRegistry::isEmpty() && registry_.empty();
}

bool CSSTransitionsRegistry::hasUpdates() const {
  return !runningTransitionTags_.empty() || !delayedTransitionsManager_.empty();
}

void CSSTransitionsRegistry::remove(const Tag viewTag) {
  removeFromUpdatesRegistry(viewTag);
  delayedTransitionsManager_.remove(viewTag);
  runningTransitionTags_.erase(viewTag);
  registry_.erase(viewTag);
}

void CSSTransitionsRegistry::add(
    jsi::Runtime &rt,
    std::shared_ptr<const ShadowNode> shadowNode,
    const CSSTransitionConfig &config) {
  const auto viewTag = shadowNode->getTag();
  auto transition = std::make_shared<CSSTransition>(std::move(shadowNode), config, viewStylesRepository_);

  registry_.insert({viewTag, transition});
}

void CSSTransitionsRegistry::update(jsi::Runtime &rt, const Tag viewTag, const CSSTransitionUpdates &updates) {
  auto transitionIt = registry_.find(viewTag);

  if (transitionIt == registry_.end()) {
    return;
  }

  const auto &transition = transitionIt->second;
  transition->update(rt, updates);
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
      addUpdatesToBatch(transition->getShadowNode(), updates);
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
  const auto viewTag = transition->getShadowNode()->getViewTag();
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

}

} // namespace reanimated::css
