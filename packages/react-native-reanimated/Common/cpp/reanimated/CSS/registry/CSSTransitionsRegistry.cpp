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

  registry_.at(viewTag)->updateSettings(rt, updatedSettings);
  // TODO - activate if settings have changed
  // operationsBatch_.emplace_back(TransitionOperation::ACTIVATE, viewTag);
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

    if (updates.isUndefined()) {
      operationsBatch_.emplace_back(TransitionOperation::DEACTIVATE, viewTag);
    } else {
      updatesBatch_.emplace_back(
          transition->getShadowNode(),
          std::make_unique<jsi::Value>(rt, updates));
    }
  }
}

void CSSTransitionsRegistry::activateDelayedTransitions(
    const time_t timestamp) {
  while (!delayedTransitionsQueue_.empty() &&
         delayedTransitionsQueue_.top().first <= timestamp) {
    const auto [_, viewTag] = delayedTransitionsQueue_.top();
    delayedTransitionsQueue_.pop();
    delayedTransitionTags_.erase(viewTag);
    runningTransitionTags_.insert(viewTag);
    operationsBatch_.emplace_back(TransitionOperation::ACTIVATE, viewTag);
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
      runningTransitionTags_.insert(viewTag);
      break;
    case TransitionOperation::DEACTIVATE:
      runningTransitionTags_.erase(viewTag);
      break;
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

    if (!changedProps.changedPropertyNames.size()) {
      return;
    }
    const auto shadowNode = transition->getShadowNode();

    {
      std::lock_guard<std::mutex> lock{mutex_};
      transition->run(rt, changedProps, getCurrentTimestamp_());

      // Assign new props to the registry overridden with interpolated values
      // for props that are/will be transitioned
      // (we need to do this step after calling the run method that creates
      // respective interpolators)
      const auto &interpolatedProps =
          transition->getCurrentInterpolationStyle(rt);
      updatesRegistry_[viewTag] =
          std::make_pair(shadowNode, dynamicFromValue(rt, interpolatedProps));

      operationsBatch_.emplace_back(TransitionOperation::ACTIVATE, viewTag);
    }
  };
};

} // namespace reanimated
