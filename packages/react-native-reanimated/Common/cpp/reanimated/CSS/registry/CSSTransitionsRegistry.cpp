#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/registry/CSSTransitionsRegistry.h>

namespace reanimated {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
    const GetAnimationTimestampFunction &getCurrentTimestamp)
    : getCurrentTimestamp_(getCurrentTimestamp),
      staticPropsRegistry_(staticPropsRegistry) {}

void CSSTransitionsRegistry::updateSettings(
    jsi::Runtime &rt,
    const Tag viewTag,
    const PartialCSSTransitionSettings &updatedSettings) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto &transition = registry_.at(viewTag);
  transition->updateSettings(updatedSettings);

  // Replace style overrides with the new ones if transition properties were
  // updated (we want to keep overrides only for transitioned properties)
  if (updatedSettings.properties.has_value()) {
    const auto &currentStyle = transition->getCurrentInterpolationStyle(rt);
    updatesRegistry_[viewTag] = std::make_pair(
        transition->getShadowNode(), dynamicFromValue(rt, currentStyle));
  }
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
  delayedTransitionsMap_.erase(viewTag);
  runningTransitionTags_.erase(viewTag);
  updatesRegistry_.erase(viewTag);
  registry_.erase(viewTag);
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

    if (transition->getState() != TransitionProgressState::RUNNING) {
      it = runningTransitionTags_.erase(it);
    } else {
      ++it;
    }
  }
}

void CSSTransitionsRegistry::activateDelayedTransitions(
    const double timestamp) {
  while (!delayedTransitionsQueue_.empty() &&
         delayedTransitionsQueue_.top()->startTimestamp <= timestamp) {
    const auto &delayedTransition = delayedTransitionsQueue_.top();
    const auto viewTag = delayedTransition->viewTag;
    delayedTransitionsQueue_.pop();

    // Add only these transitions which weren't marked for removal
    // and weren't removed in the meantime
    if (delayedTransition->startTimestamp != 0 &&
        registry_.find(viewTag) != registry_.end()) {
      delayedTransitionsMap_.erase(viewTag);
      runningTransitionTags_.insert(viewTag);
    }
  }
}

void CSSTransitionsRegistry::scheduleOrActivateTransition(
    const std::shared_ptr<CSSTransition> &transition) {
  const auto viewTag = transition->getViewTag();
  const auto currentTimestamp = getCurrentTimestamp_();
  const auto minDelay = transition->getMinDelay(currentTimestamp);

  // Mark the already delayed transition for removal
  const auto delayedTransitionIt = delayedTransitionsMap_.find(viewTag);
  if (delayedTransitionIt != delayedTransitionsMap_.end()) {
    delayedTransitionIt->second->startTimestamp = 0;
  }

  if (minDelay > 0) {
    const auto delayedTransition = std::make_shared<DelayedTransition>(
        viewTag, currentTimestamp + minDelay);
    delayedTransitionsMap_[viewTag] = delayedTransition;
    delayedTransitionsQueue_.push(delayedTransition);
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
    const auto &transitionProperties = transition->getProperties();
    const auto changedProps =
        getChangedProps(rt, oldProps, newProps, transitionProperties);

    if (changedProps.changedPropertyNames.empty()) {
      return;
    }
    const auto &shadowNode = transition->getShadowNode();

    {
      std::lock_guard<std::mutex> lock{mutex_};

      const auto &initialProps =
          transition->run(rt, changedProps, getCurrentTimestamp_());
      updatesRegistry_[viewTag] =
          std::make_pair(shadowNode, dynamicFromValue(rt, initialProps));
      scheduleOrActivateTransition(transition);
    }
  };
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
