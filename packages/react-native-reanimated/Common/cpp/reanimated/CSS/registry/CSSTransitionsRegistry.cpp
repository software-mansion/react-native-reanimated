#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/registry/CSSTransitionsRegistry.h>

namespace reanimated {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
    const GetAnimationTimestampFunction &getCurrentTimestamp)
    : getCurrentTimestamp_(getCurrentTimestamp),
      staticPropsRegistry_(staticPropsRegistry) {}

bool CSSTransitionsRegistry::hasUpdates() const {
  return !runningTransitionTags_.empty() || !delayedTransitionsManager_.empty();
}

void CSSTransitionsRegistry::add(
    const std::shared_ptr<CSSTransition> &transition) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto &shadowNode = transition->getShadowNode();
  const auto viewTag = shadowNode->getTag();

  registry_.insert({viewTag, transition});
  PropsObserver observer = createPropsObserver(viewTag);
  staticPropsRegistry_->setObserver(viewTag, std::move(observer));
}

void CSSTransitionsRegistry::remove(const Tag viewTag) {
  std::lock_guard<std::mutex> lock{mutex_};

  staticPropsRegistry_->removeObserver(viewTag);
  delayedTransitionsManager_.remove(viewTag);
  runningTransitionTags_.erase(viewTag);
  updatesRegistry_.erase(viewTag);
  registry_.erase(viewTag);
}

void CSSTransitionsRegistry::updateSettings(
    jsi::Runtime &rt,
    const Tag viewTag,
    const PartialCSSTransitionConfig &config) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto &transition = registry_.at(viewTag);
  transition->updateSettings(config);

  // Replace style overrides with the new ones if transition properties were
  // updated (we want to keep overrides only for transitioned properties)
  if (config.properties.has_value()) {
    const auto &currentStyle = transition->getCurrentInterpolationStyle(rt);
    updatesRegistry_[viewTag] = std::make_pair(
        transition->getShadowNode(), dynamicFromValue(rt, currentStyle));
  }
}

void CSSTransitionsRegistry::update(jsi::Runtime &rt, const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  // Activate all delayed transitions that should start now
  activateDelayedTransitions(timestamp);

  // Iterate over active transitions and update them
  for (auto it = runningTransitionTags_.begin();
       it != runningTransitionTags_.end();) {
    const auto &viewTag = *it;
    const auto &transition = registry_.at(viewTag);

    const jsi::Value &updates = transition->update(rt, timestamp);
    if (!updates.isUndefined()) {
      updatesBatch_.emplace_back(
          transition->getShadowNode(),
          std::make_unique<jsi::Value>(rt, updates));
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
    const auto &delayedTransition = delayedTransitionsManager_.pop();
    const auto viewTag = delayedTransition.id;

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
  return [this, viewTag](
             jsi::Runtime &rt,
             const jsi::Value &oldProps,
             const jsi::Value &newProps) {
    const auto &transition = registry_.at(viewTag);
    const auto changedProps = getChangedProps(
        rt,
        oldProps,
        newProps,
        transition->getAllowDiscrete(),
        transition->getProperties());

    if (changedProps.changedPropertyNames.empty()) {
      return;
    }

    {
      std::lock_guard<std::mutex> lock{mutex_};

      const auto &initialProps =
          transition->run(rt, changedProps, getCurrentTimestamp_());
      const auto &shadowNode = transition->getShadowNode();
      updatesRegistry_[viewTag] =
          std::make_pair(shadowNode, dynamicFromValue(rt, initialProps));
      scheduleOrActivateTransition(transition);
    }
  };
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
