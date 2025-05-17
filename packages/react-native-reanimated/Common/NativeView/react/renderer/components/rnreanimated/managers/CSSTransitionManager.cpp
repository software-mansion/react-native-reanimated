#include <react/renderer/components/rnreanimated/managers/CSSTransitionManager.h>

namespace facebook::react {

CSSTransitionManager::CSSTransitionManager(
    std::shared_ptr<OperationsLoop> operationsLoop,
    std::shared_ptr<ViewStylesRepository> viewStylesRepository)
    : operationsLoop_(std::move(operationsLoop)),
      viewStylesRepository_(std::move(viewStylesRepository)) {}

CSSTransitionManager::~CSSTransitionManager() {
  if (transition_) {
    removeTransition();
  }
}

folly::dynamic CSSTransitionManager::getCurrentFrameProps(
    const ShadowNode::Shared &shadowNode) {
  if (!transition_) {
    lastFrameProps_ = folly::dynamic::object();
  } else {
    lastFrameProps_ =
        transition_->getCurrentFrameProps(shadowNode, viewStylesRepository_);
  }

  return lastFrameProps_;
}

void CSSTransitionManager::update(
    const ReanimatedNodeProps &oldProps,
    const ReanimatedNodeProps &newProps) {
  updateTransitionInstance(oldProps.cssTransition, newProps.cssTransition);
  if (transition_) {
    // Run transition if at least one of transition properties has changed
    runTransitionForChangedProperties(oldProps.jsStyle, newProps.jsStyle);
  }
}

void CSSTransitionManager::updateTransitionInstance(
    const std::optional<CSSTransitionConfig> &oldConfig,
    const std::optional<CSSTransitionConfig> &newConfig) {
  if (!transition_) {
    if (newConfig.has_value()) {
      transition_ = std::make_shared<CSSTransition>(newConfig.value());
    }
  } else if (!newConfig.has_value()) {
    removeTransition();
  } else if (oldConfig != newConfig) {
    // TODO
  }
}

void CSSTransitionManager::runTransitionForChangedProperties(
    const folly::dynamic &oldProps,
    const folly::dynamic &newProps) {
  const auto allowedProperties =
      transition_->getAllowedProperties(oldProps, newProps);
  if (allowedProperties.empty()) {
    return;
  }

  auto changedProps = getChangedProps(oldProps, newProps, allowedProperties);

  if (!changedProps.changedPropertyNames.empty()) {
    // Remove the currently running transition from the loop (if there was one)
    // and schedule a new one with the changed props
    operationsLoop_->remove(operationHandle_);
    runTransition(std::move(changedProps));
  }
}

void CSSTransitionManager::removeTransition() {
  operationsLoop_->remove(operationHandle_);
  transition_ = nullptr;
}

void CSSTransitionManager::runTransition(ChangedProps &&changedProps) {
  const auto &transition = transition_;
  operationHandle_ = operationsLoop_->schedule(
      Operation()
          .doOnce([transition,
                   lastFrameProps = lastFrameProps_,
                   props = std::move(changedProps)](double timestamp) mutable {
            transition->run(timestamp, props, lastFrameProps);
          })
          .waitFor([transition](double timestamp) {
            return transition->getMinDelay(timestamp);
          })
          .doWhile([transition](double timestamp) mutable {
            transition->update(timestamp);
            return transition->getState() == TransitionProgressState::Running;
          })
          .build());
}

} // namespace facebook::react
