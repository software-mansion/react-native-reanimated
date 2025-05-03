#include <reanimated/CSS/manager/CSSTransitionManager.h>

namespace reanimated::css {

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
    const ShadowNode::Shared &shadowNode) const {
  if (!transition_) {
    return folly::dynamic();
  }
  return transition_->getCurrentFrameProps(shadowNode, viewStylesRepository_);
}

void CSSTransitionManager::update(
    const ReanimatedViewProps &oldProps,
    const ReanimatedViewProps &newProps) {
  updateTransitionInstance(oldProps.cssTransition, newProps.cssTransition);
  // Run transition if at least one of transition properties has changed
  runTransitionForChangedProperties(oldProps.jsStyle, newProps.jsStyle);
}

void CSSTransitionManager::updateTransitionInstance(
    const folly::dynamic &oldConfig,
    const folly::dynamic &newConfig) {
  if (!transition_) {
    if (!newConfig.empty()) {
      createTransition(newConfig);
    }
  } else if (newConfig.empty()) {
    removeTransition();
    return;
  } else {
    const auto &oldConfig = oldProps.cssTransition;
    updateTransition(oldConfig, newConfig);
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

void CSSTransitionManager::createTransition(const folly::dynamic &config) {
  transition_ = CSSTransition(parseCSSTransitionConfig(config));
}

void CSSTransitionManager::removeTransition() {
  operationsLoop_->remove(operationHandle_);
  transition_ = std::nullopt;
}

void CSSTransitionManager::updateTransition(
    const folly::dynamic &oldConfig,
    const folly::dynamic &newConfig) {
  const auto updates =
      getParsedCSSTransitionConfigUpdates(oldConfig, newConfig);
  transition_->updateSettings(updates);
}

void CSSTransitionManager::runTransition(folly::dynamic &&changedProps) {
  operationHandle_ =
      operationsLoop_->createOperation()
          .doOnce([transition = transition_,
                   props = std::move(changedProps)](double timestamp) mutable {
            transition->run(timestamp, props);
          })
          .waitFor([transition = transition_](double timestamp) {
            return transition->getMinDelay(timestamp);
          })
          .doWhile([transition = transition_](double timestamp) mutable {
            transition->update(timestamp);
            return transition->getState() == TransitionProgressState::Running;
          })
          .schedule();
}

} // namespace reanimated::css
