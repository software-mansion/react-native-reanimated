#include <reanimated/CSS/registry/CSSTransitionsRegistry.h>

namespace reanimated {

jsi::Value CSSTransitionsRegistry::handleUpdate(
    jsi::Runtime &rt,
    const time_t timestamp,
    const std::shared_ptr<CSSTransition> &transition) {
  if (transition->getState(timestamp) == TransitionProgressState::PENDING) {
    operationsBatch_.emplace_back(
        TransitionOperation::DEACTIVATE, transition->getId());
  }
  return transition->update(rt, timestamp);
}

void CSSTransitionsRegistry::handleOperation(
    jsi::Runtime &rt,
    const TransitionOperation operation,
    const std::shared_ptr<CSSTransition> &transition,
    const time_t timestamp) {
  switch (operation) {
    case TransitionOperation::ADD:
      addOperation(rt, transition, timestamp);
      break;
    case TransitionOperation::REMOVE:
      removeOperation(rt, transition);
      break;
    case TransitionOperation::ACTIVATE:
      activateOperation(transition->getId());
      break;
    case TransitionOperation::DEACTIVATE:
      deactivateOperation(transition, timestamp);
      break;
  }
}

void CSSTransitionsRegistry::addOperation(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSTransition> &transition,
    const time_t timestamp) {
  const auto startTimestamp = timestamp + transition->getMinDelay();
  if (startTimestamp > timestamp) {
    // Add transition to the delayed transitions queue
    delayedIds_.emplace(startTimestamp, transition->getId());
  } else {
    runningIds_.insert(transition->getId());
  }
}

void CSSTransitionsRegistry::removeOperation(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSTransition> &transition) {
  tagsToRemove_.insert(transition->getShadowNode()->getTag());

  // Apply the view style before transition removal
  const jsi::Value &viewStyle = transition->getViewStyle(rt);
  if (!viewStyle.isUndefined()) {
    updatesBatch_.emplace_back(
        transition->getShadowNode(),
        std::make_unique<jsi::Value>(rt, viewStyle));
  }

  const auto id = transition->getId();
  registry_.erase(id);
  runningIds_.erase(id);
}

void CSSTransitionsRegistry::activateOperation(const unsigned id) {
  runningIds_.insert(id);
}

void CSSTransitionsRegistry::deactivateOperation(
    const std::shared_ptr<CSSTransition> &transition,
    const time_t timestamp) {
  const auto id = transition->getId();
  runningIds_.erase(id);
  tagsToRemove_.insert(transition->getShadowNode()->getTag());
}

} // namespace reanimated
