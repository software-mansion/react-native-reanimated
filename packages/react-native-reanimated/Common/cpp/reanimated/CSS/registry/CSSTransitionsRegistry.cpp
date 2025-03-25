#include <reanimated/CSS/registry/CSSTransitionsRegistry.h>

namespace reanimated::css {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
    const GetAnimationTimestampFunction &getCurrentTimestamp)
    : getCurrentTimestamp_(getCurrentTimestamp),
      staticPropsRegistry_(staticPropsRegistry) {}

bool CSSTransitionsRegistry::isEmpty() const {
  return registry_.empty();
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
  staticPropsRegistry_->removeObserver(viewTag);
  delayedTransitionsManager_.remove(viewTag);
  runningTransitionTags_.erase(viewTag);
  registry_.erase(viewTag);
}

void CSSTransitionsRegistry::updateSettings(
    const Tag viewTag,
    const PartialCSSTransitionConfig &config) {
  registry_[viewTag]->updateSettings(config);
}

void CSSTransitionsRegistry::flushFrameUpdates(
    PropsBatch &updatesBatch,
    const double timestamp) {
  handleUpdate(
      [&](const ShadowNode::Shared &shadowNode, const folly::dynamic &props) {
        updatesBatch.emplace_back(shadowNode, props);
      },
      timestamp);
}

void CSSTransitionsRegistry::collectAllProps(
    PropsMap &propsMap,
    const double timestamp) {
  // We can reuse the same logic as for the frame update because transitions
  // have no fill mode, so they affect the view style only when they are running
  handleUpdate(
      [&](const ShadowNode::Shared &shadowNode, const folly::dynamic &props) {
        addToPropsMap(propsMap, shadowNode, props);
      },
      timestamp);
}

void CSSTransitionsRegistry::handleUpdate(
    const UpdateHandler &handler,
    const double timestamp) {
  // Activate all delayed transitions that should start now
  activateDelayedTransitions(timestamp);

  // Iterate over active transitions and update them
  for (auto it = runningTransitionTags_.begin();
       it != runningTransitionTags_.end();) {
    const auto &viewTag = *it;
    const auto &transition = registry_[viewTag];

    handler(transition->getShadowNode(), transition->update(timestamp));

    // We remove transition from running and schedule it when animation of
    // one of properties has finished and the other one is still delayed
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

      transition->run(changedProps, strongThis->getCurrentTimestamp_());
      strongThis->scheduleOrActivateTransition(transition);
    }
  };
}

} // namespace reanimated::css
