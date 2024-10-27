#include <reanimated/CSS/registry/CSSTransitionsRegistry.h>

namespace reanimated {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
    GetAnimationTimestampFunction &getCurrentTimestamp)
    : staticPropsRegistry_(staticPropsRegistry),
      getCurrentTimestamp_(getCurrentTimestamp) {}

void CSSTransitionsRegistry::updateSettings(
    jsi::Runtime &rt,
    const Tag viewTag,
    const PartialCSSTransitionSettings &updatedSettings) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto &transition = registry_.at(viewTag);
  transition->updateSettings(rt, updatedSettings);

  // Replace style overrides with the new ones if transition properties were
  // updated (we want to keep overrides only for transitioned properties)
  if (updatedSettings.properties.has_value()) {
    const auto &currentStyle = transition->getCurrentInterpolationStyle(rt);
    updatesRegistry_[viewTag] = std::make_pair(
        transition->getShadowNode(), dynamicFromValue(rt, currentStyle));
  }
}

void CSSTransitionsRegistry::add(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSTransition> &transition) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto &shadowNode = transition->getShadowNode();
  const auto viewTag = shadowNode->getTag();

  registry_.insert({viewTag, transition});
  PropsObserver observer = createPropsObserver(viewTag);
  staticPropsRegistry_->setObserver(viewTag, observer);
}

void CSSTransitionsRegistry::remove(jsi::Runtime &rt, const Tag viewTag) {
  std::lock_guard<std::mutex> lock{mutex_};

  staticPropsRegistry_->removeObserver(viewTag);
  delayedTransitionsMap_.erase(viewTag);
  runningTransitionTags_.erase(viewTag);
  updatesRegistry_.erase(viewTag);
  registry_.erase(viewTag);
}

void CSSTransitionsRegistry::update(jsi::Runtime &rt, const time_t timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  // Activate all delayed transitions that should start now
  activateDelayedTransitions(timestamp);
  // Flush all operations from the batch
  flushOperations();

  // Iterate over active transitions and update them
  for (const auto &viewTag : runningTransitionTags_) {
    const auto &transition = registry_.at(viewTag);
    const jsi::Value &updates = handleUpdate(rt, timestamp, transition);

    if (transition->getState(timestamp) != TransitionProgressState::RUNNING) {
      operationsBatch_.emplace_back(TransitionOperation::DEACTIVATE, viewTag);
    }
    if (!updates.isUndefined()) {
      updatesBatch_.emplace_back(
          transition->getShadowNode(),
          std::make_unique<jsi::Value>(rt, updates));
    }
  }
}

void CSSTransitionsRegistry::activateDelayedTransitions(
    const time_t timestamp) {
  while (!delayedTransitionsQueue_.empty() &&
         delayedTransitionsQueue_.top()->startTimestamp <= timestamp) {
    const auto &delayedTransition = delayedTransitionsQueue_.top();
    const auto startTimestamp = delayedTransition->startTimestamp;
    const auto viewTag = delayedTransition->viewTag;
    delayedTransitionsQueue_.pop();

    // Add only these transitions which weren't marked for removal
    // and weren't removed in the meantime
    if (startTimestamp != 0 && registry_.find(viewTag) != registry_.end()) {
      delayedTransitionsMap_.erase(viewTag);
      runningTransitionTags_.insert(viewTag);
    }
  }
}

void CSSTransitionsRegistry::flushOperations() {
  auto copiedOperationsBatch = std::move(operationsBatch_);
  operationsBatch_.clear();

  for (const auto &[operation, viewTag] : copiedOperationsBatch) {
    if (registry_.find(viewTag) != registry_.end()) {
      handleOperation(operation, viewTag);
    }
  }
}

jsi::Value CSSTransitionsRegistry::handleUpdate(
    jsi::Runtime &rt,
    const time_t timestamp,
    const std::shared_ptr<CSSTransition> &transition) {
  if (transition->getState(timestamp) == TransitionProgressState::FINISHED) {
    operationsBatch_.emplace_back(
        TransitionOperation::DEACTIVATE, transition->getViewTag());
  }
  return transition->update(rt, timestamp);
}

void CSSTransitionsRegistry::handleOperation(
    const TransitionOperation operation,
    const Tag viewTag) {
  switch (operation) {
    case TransitionOperation::ACTIVATE:
      activateOperation(viewTag);
      break;
    case TransitionOperation::DEACTIVATE:
      deactivateOperation(viewTag);
      break;
  }
}

void CSSTransitionsRegistry::activateOperation(const Tag viewTag) {
  const auto transitionIt = registry_.find(viewTag);
  if (transitionIt == registry_.end()) {
    return;
  }
  const auto &transition = transitionIt->second;
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
    if (runningTransitionTags_.find(viewTag) != runningTransitionTags_.end()) {
      runningTransitionTags_.erase(viewTag);
    }
  } else {
    runningTransitionTags_.insert(viewTag);
  }
}

void CSSTransitionsRegistry::deactivateOperation(const Tag viewTag) {
  runningTransitionTags_.erase(viewTag);
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

    if (!changedProps.changedPropertyNames.size()) {
      return;
    }
    const auto &shadowNode = transition->getShadowNode();

    {
      std::lock_guard<std::mutex> lock{mutex_};

      const auto &initialProps =
          transition->run(rt, changedProps, getCurrentTimestamp_());
      updatesRegistry_[viewTag] =
          std::make_pair(shadowNode, dynamicFromValue(rt, initialProps));
      operationsBatch_.emplace_back(TransitionOperation::ACTIVATE, viewTag);
    }
  };
};

} // namespace reanimated
