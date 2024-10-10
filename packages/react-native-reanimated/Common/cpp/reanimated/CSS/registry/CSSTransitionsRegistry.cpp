#include <reanimated/CSS/registry/CSSTransitionsRegistry.h>

namespace reanimated {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
    GetAnimationTimestampFunction &getCurrentTimestamp)
    : staticPropsRegistry_(staticPropsRegistry),
      getCurrentTimestamp_(getCurrentTimestamp) {}

void CSSTransitionsRegistry::updateSettings(
    jsi::Runtime &rt,
    const unsigned id,
    const PartialCSSTransitionSettings &updatedSettings) {
  registry_.at(id)->updateSettings(rt, updatedSettings);
  operationsBatch_.emplace_back(TransitionOperation::ACTIVATE, id);
}

void CSSTransitionsRegistry::add(
    const std::shared_ptr<CSSTransition> &transition) {
  const auto id = transition->getId();
  registry_.insert({id, transition});
  PropsObserver observer = createPropsObserver(id);
  staticPropsRegistry_->addObserver(
      id, transition->getShadowNode()->getTag(), observer);
}

void CSSTransitionsRegistry::remove(const unsigned id) {
  runningTransitionIds_.erase(id);
  registry_.erase(id);
  staticPropsRegistry_->removeObserver(id);
}

void CSSTransitionsRegistry::update(jsi::Runtime &rt, const time_t timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  // Activate all delayed transitions that should start now
  activateDelayedTransitions(timestamp);
  // Flush all operations from the batch
  flushOperations();

  // Iterate over active transitions and update them
  for (const auto &id : runningTransitionIds_) {
    const auto &transition = registry_.at(id);
    const jsi::Value &updates = handleUpdate(rt, timestamp, transition);

    if (updates.isUndefined()) {
      // TODO - uncomment once style interpolator is ready
      // operationsBatch_.emplace_back(TransitionOperation::DEACTIVATE, id);
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
    const auto [_, id] = delayedTransitionsQueue_.top();
    delayedTransitionsQueue_.pop();
    delayedTransitionIds_.erase(id);
    runningTransitionIds_.insert(id);
    operationsBatch_.emplace_back(TransitionOperation::ACTIVATE, id);
  }
}

void CSSTransitionsRegistry::flushOperations() {
  auto copiedOperationsBatch = std::move(operationsBatch_);
  operationsBatch_.clear();

  for (const auto &[operation, id] : copiedOperationsBatch) {
    if (registry_.find(id) != registry_.end()) {
      handleOperation(operation, id);
    }
  }
}

jsi::Value CSSTransitionsRegistry::handleUpdate(
    jsi::Runtime &rt,
    const time_t timestamp,
    const std::shared_ptr<CSSTransition> &transition) {
  if (transition->getState(timestamp) == TransitionProgressState::PENDING) {
    // operationsBatch_.emplace_back(
    //     TransitionOperation::DEACTIVATE, transition->getId());
  }
  return transition->update(rt, timestamp);
}

void CSSTransitionsRegistry::handleOperation(
    const TransitionOperation operation,
    const unsigned id) {
  switch (operation) {
    case TransitionOperation::ACTIVATE:
      runningTransitionIds_.insert(id);
      break;
    case TransitionOperation::DEACTIVATE:
      runningTransitionIds_.erase(id);
      break;
  }
}

PropsObserver CSSTransitionsRegistry::createPropsObserver(const unsigned id) {
  return [this, id](
             jsi::Runtime &rt,
             const jsi::Value &oldProps,
             const jsi::Value &newProps) {
    const auto &transition = registry_.at(id);
    const auto &transitionProperties = transition->getProperties();
    const auto changedProps =
        getChangedProps(rt, oldProps, newProps, transitionProperties.get());

    if (!changedProps.changedPropertyNames.size()) {
      return;
    }

    {
      std::lock_guard<std::mutex> lock{mutex_};
      transition->run(rt, changedProps, getCurrentTimestamp_());
      operationsBatch_.emplace_back(TransitionOperation::ACTIVATE, id);
    }
  };
};

} // namespace reanimated
