#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/registries/CSSTransitionsRegistry.h>

#include <memory>
#include <utility>

namespace reanimated::css {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
    const GetAnimationTimestampFunction &getCurrentTimestamp)
    : getCurrentTimestamp_(getCurrentTimestamp), staticPropsRegistry_(staticPropsRegistry) {}

bool CSSTransitionsRegistry::isEmpty() const {
  // The registry is empty if has no registered animations and no updates
  // stored in the updates registry
  return UpdatesRegistry::isEmpty() && registry_.empty();
}

bool CSSTransitionsRegistry::hasUpdates() const {
  return !runningTransitionTags_.empty() || !delayedTransitionsManager_.empty();
}

void CSSTransitionsRegistry::ensureTransition(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  const auto viewTag = shadowNode->getTag();
  if (registry_.find(viewTag) == registry_.end()) {
    auto transition = std::make_shared<CSSTransition>(shadowNode, viewStylesRepository);
    registry_.insert({viewTag, transition});
  }
}

void CSSTransitionsRegistry::remove(const Tag viewTag) {
  removeFromUpdatesRegistry(viewTag);
  delayedTransitionsManager_.remove(viewTag);
  runningTransitionTags_.erase(viewTag);
  registry_.erase(viewTag);
}

void CSSTransitionsRegistry::run(
    const Tag viewTag,
    const folly::dynamic &changedProps,
    const CSSTransitionPropertiesSettings &settings) { // Settings are required
  if (registry_.find(viewTag) == registry_.end()) {
    return;
  }

  const auto &transition = registry_[viewTag];

  // If no changed props, nothing to do
  if (changedProps.empty() || !changedProps.isObject()) {
    return;
  }

  // Parse the changed props diff from JS
  ChangedProps props = parseChangedPropsFromDiff(changedProps);

  if (props.changedPropertyNames.empty() && props.removedPropertyNames.empty()) {
    return;
  }

  std::lock_guard<std::mutex> lock{mutex_};

  const auto &shadowNode = transition->getShadowNode();
  const auto &lastUpdates = getUpdatesFromRegistry(shadowNode->getTag());
  const auto &transitionStartStyle = transition->run(props, settings, lastUpdates, getCurrentTimestamp_());
  updateInUpdatesRegistry(transition, transitionStartStyle);
  scheduleOrActivateTransition(transition);
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
  // Store only the current updates without merging with last updates
  setInUpdatesRegistry(shadowNode, updates);
}

} // namespace reanimated::css
