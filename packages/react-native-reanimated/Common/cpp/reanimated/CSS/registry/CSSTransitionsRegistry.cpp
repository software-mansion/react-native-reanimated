#include <reanimated/CSS/registry/CSSTransitionsRegistry.h>

namespace reanimated::css {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
    const GetAnimationTimestampFunction &getCurrentTimestamp)
    : getCurrentTimestamp_(getCurrentTimestamp),
      staticPropsRegistry_(staticPropsRegistry) {}

bool CSSTransitionsRegistry::isEmpty() const {
  // The registry is empty if has no registered animations and no updates
  // stored in the updates registry
  return UpdatesRegistry::isEmpty() && registry_.empty();
}

bool CSSTransitionsRegistry::hasUpdates() const {
  return !runningTransitionTags_.empty() || !delayedTransitionsManager_.empty();
}

void CSSTransitionsRegistry::add(
    const std::shared_ptr<CSSTransition> &transition) {
  const auto &shadowNode = transition->getShadowNode();
  const auto viewTag = shadowNode->getTag();

  registry_.insert({viewTag, transition});
  PropsObserver observer = createPropsObserver(viewTag);
  staticPropsRegistry_->setObserver(viewTag, std::move(observer));
}

void CSSTransitionsRegistry::remove(const Tag viewTag) {
  removeFromUpdatesRegistry(viewTag);
  staticPropsRegistry_->removeObserver(viewTag);
  delayedTransitionsManager_.remove(viewTag);
  runningTransitionTags_.erase(viewTag);
  registry_.erase(viewTag);
}

void CSSTransitionsRegistry::updateSettings(
    const Tag viewTag,
    const PartialCSSTransitionConfig &config) {
  const auto &transition = registry_[viewTag];
  transition->updateSettings(config);

  // Replace style overrides with the new ones if transition properties were
  // updated (we want to keep overrides only for transitioned properties)
  if (config.properties.has_value()) {
    updateInUpdatesRegistry(
        transition, transition->getCurrentInterpolationStyle());
  }
}

void CSSTransitionsRegistry::update(const double timestamp) {
  // Activate all delayed transitions that should start now
  activateDelayedTransitions(timestamp);

  // Iterate over active transitions and update them
  for (auto it = runningTransitionTags_.begin();
       it != runningTransitionTags_.end();) {
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
      delayedTransitionsManager_.add(
          timestamp + transition->getMinDelay(timestamp), viewTag);
    }

    if (transition->getState() != TransitionProgressState::Running) {
      it = runningTransitionTags_.erase(it);
    } else {
      ++it;
    }
  }
}

void CSSTransitionsRegistry::activateDelayedTransitions(
    const double timestamp) {
  while (!delayedTransitionsManager_.empty() &&
         delayedTransitionsManager_.top().timestamp <= timestamp) {
    const auto [_, viewTag] = delayedTransitionsManager_.pop();

    // Add only these transitions which weren't removed in the meantime
    if (registry_.find(viewTag) != registry_.end()) {
      runningTransitionTags_.insert(viewTag);
    }
  }
}

void CSSTransitionsRegistry::scheduleOrActivateTransition(
    const std::shared_ptr<CSSTransition> &transition) {
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

PropsObserver CSSTransitionsRegistry::createPropsObserver(const Tag viewTag) {
  return [weakThis = weak_from_this(), viewTag](
             const folly::dynamic &oldProps, const folly::dynamic &newProps) {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    const auto &transition = strongThis->registry_[viewTag];
    const auto allowedProperties =
        transition->getAllowedProperties(oldProps, newProps);

    const auto changedProps =
        getChangedProps(oldProps, newProps, allowedProperties);

    if (changedProps.changedPropertyNames.empty()) {
      return;
    }

    {
      std::lock_guard<std::mutex> lock{strongThis->mutex_};

      const auto &shadowNode = transition->getShadowNode();
      const auto &lastUpdates =
          strongThis->getUpdatesFromRegistry(shadowNode->getTag());
      const auto &transitionStartStyle = transition->run(
          changedProps, lastUpdates, strongThis->getCurrentTimestamp_());
      strongThis->updateInUpdatesRegistry(transition, transitionStartStyle);
      strongThis->scheduleOrActivateTransition(transition);
    }
  };
}

void CSSTransitionsRegistry::updateInUpdatesRegistry(
    const std::shared_ptr<CSSTransition> &transition,
    const folly::dynamic &updates) {
  const auto &shadowNode = transition->getShadowNode();
  const auto &lastUpdates = getUpdatesFromRegistry(shadowNode->getTag());
  const auto &transitionProperties = transition->getProperties();

  folly::dynamic filteredUpdates = folly::dynamic::object;

  if (!transitionProperties.has_value()) {
    // If transitionProperty is set to 'all' (optional has no value), we have
    // to keep the result of the previous transition updated with the new
    // transition starting values
    if (!lastUpdates.empty()) {
      filteredUpdates = lastUpdates;
    }
  } else if (!lastUpdates.empty()) {
    // Otherwise, we keep only allowed properties from the last updates
    // and update the object with the new transition starting values
    for (const auto &prop : transitionProperties.value()) {
      if (lastUpdates.count(prop)) {
        filteredUpdates[prop] = lastUpdates[prop];
      }
    }
  }

  // updates object contains only allowed properties so we don't need
  // to do additional filtering here
  filteredUpdates.update(updates);
  setInUpdatesRegistry(shadowNode, filteredUpdates);
}

} // namespace reanimated::css
