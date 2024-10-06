#include <reanimated/CSS/registry/CSSTransitionsRegistry.h>

namespace reanimated {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry)
    : staticPropsRegistry_(staticPropsRegistry) {}

void CSSTransitionsRegistry::add(
    const std::shared_ptr<CSSTransition> &transition) {
  PropsObserver observer = createPropsObserver(transition);
  staticPropsRegistry_->addObserver(
      transition->getId(), transition->getShadowNode()->getTag(), observer);
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

PropsObserver CSSTransitionsRegistry::createPropsObserver(
    const std::shared_ptr<CSSTransition> &transition) {
  return [this, transition](
             const jsi::Runtime &rt,
             const jsi::Value &oldProps,
             const jsi::Value &newProps) {
    const auto &propertyNames = transition->getPropertyNames();
    const auto changedPropNames =
        getChangedProps(rt, propertyNames, oldProps, newProps);

    if (!changedPropNames.empty()) {
      // TODO - start the transition for modified props
      LOG(INFO) << "Changed props:";
      for (const auto &propName : changedPropNames) {
        LOG(INFO) << propName;
      }
    }
  };
};

} // namespace reanimated
