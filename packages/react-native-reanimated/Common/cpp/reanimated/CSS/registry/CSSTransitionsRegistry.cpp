#include <reanimated/CSS/registry/CSSTransitionsRegistry.h>

namespace reanimated {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry)
    : staticPropsRegistry_(staticPropsRegistry) {}

void CSSTransitionsRegistry::add(
    const std::shared_ptr<CSSTransition> &transition) {
  LOG(INFO) << "Adding transition";
  const auto id = transition->getId();
  registry_.insert({id, transition});
  PropsObserver observer = createPropsObserver(id);
  staticPropsRegistry_->addObserver(
      id, transition->getShadowNode()->getTag(), observer);
  operationsBatch_.emplace_back(TransitionOperation::ADD, id);
}

void CSSTransitionsRegistry::remove(const unsigned id) {
  operationsBatch_.emplace_back(TransitionOperation::REMOVE, id);
  staticPropsRegistry_->removeObserver(id);
}

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
    const time_t timestamp) {}

void CSSTransitionsRegistry::removeOperation(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSTransition> &transition) {
  const auto id = transition->getId();

  registry_.erase(id);
  runningIds_.erase(id);
  staticPropsRegistry_->removeObserver(id);
  tagsToRemove_.insert(transition->getShadowNode()->getTag());

  // Apply the view style before transition removal
  const jsi::Value &viewStyle = transition->getViewStyle(rt);
  if (!viewStyle.isUndefined()) {
    updatesBatch_.emplace_back(
        transition->getShadowNode(),
        std::make_unique<jsi::Value>(rt, viewStyle));
  }
}

void CSSTransitionsRegistry::activateOperation(const unsigned id) {
  runningIds_.insert(id);
}

void CSSTransitionsRegistry::deactivateOperation(
    const std::shared_ptr<CSSTransition> &transition,
    const time_t timestamp) {
  const auto id = transition->getId();
  runningIds_.erase(id);
}

PropsObserver CSSTransitionsRegistry::createPropsObserver(const unsigned id) {
  return [this, id](
             jsi::Runtime &rt,
             const jsi::Value &oldProps,
             const jsi::Value &newProps) {
    const auto transitionOptional = getItem(id);
    if (!transitionOptional.has_value()) {
      LOG(INFO) << "Transition not found";
      return;
    }

    const auto &transition = transitionOptional.value();
    const auto &propertyNames = transition->getPropertyNames();
    const auto changedProps =
        getChangedProps(rt, propertyNames, oldProps, newProps);

    if (!changedProps.empty()) {
      // TODO - start the transition for modified props
    }
  };
};

} // namespace reanimated
