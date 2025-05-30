#include <react/renderer/components/rnreanimated/managers/CSSTransitionManager.h>

namespace facebook::react {

CSSTransitionManager::CSSTransitionManager(
    std::shared_ptr<ViewStylesRepository> viewStylesRepository)
    : viewStylesRepository_(std::move(viewStylesRepository)) {}

void CSSTransitionManager::onPropsChange(
    const double timestamp,
    const ReanimatedNodeProps &oldProps,
    const ReanimatedNodeProps &newProps) {
  updateTransitionInstance(oldProps.cssTransition, newProps.cssTransition);
  if (transition_) {
    // Run transition if at least one of transition properties has changed
    runTransitionForChangedProperties(
        timestamp, oldProps.jsStyle, newProps.jsStyle);
  }
}

folly::dynamic CSSTransitionManager::onFrame(
    const double timestamp,
    const ShadowNode::Shared &shadowNode) {
  if (!transition_) {
    return folly::dynamic();
  }

  transition_->update(timestamp);
  return transition_->getCurrentFrameProps(shadowNode, viewStylesRepository_);
}

void CSSTransitionManager::updateTransitionInstance(
    const std::optional<CSSTransitionConfig> &oldConfig,
    const std::optional<CSSTransitionConfig> &newConfig) {
  if (!transition_) {
    if (newConfig.has_value()) {
      transition_ = std::make_shared<CSSTransition>(newConfig.value());
    }
  } else if (!newConfig.has_value()) {
    transition_ = nullptr;
  } else if (oldConfig != newConfig) {
    transition_->updateConfig(newConfig.value());
  }
}

void CSSTransitionManager::runTransitionForChangedProperties(
    const double timestamp,
    const folly::dynamic &oldProps,
    const folly::dynamic &newProps) {
  const auto allowedProperties =
      transition_->getAllowedProperties(oldProps, newProps);
  if (allowedProperties.empty()) {
    return;
  }

  auto changedProps = getChangedProps(oldProps, newProps, allowedProperties);

  if (!changedProps.changedPropertyNames.empty()) {
    transition_->run(timestamp, changedProps, lastFrameProps_);
  }
}

// void CSSTransitionManager::runTransition(ChangedProps &&changedProps) {
//   const auto &transition = transition_;
//   operationHandle_ = operationsLoop_->schedule(
//       Operation()
//           .doOnce([transition,
//                    lastFrameProps = lastFrameProps_,
//                    props = std::move(changedProps)](double timestamp) mutable
//                    {

//           })
//           .waitFor([transition](double timestamp) {
//             return transition->getMinDelay(timestamp);
//           })
//           .doWhile([transition](double timestamp) mutable {
//             transition->update(timestamp);
//             return transition->getState() ==
//             TransitionProgressState::Running;
//           })
//           .build());
// }

} // namespace facebook::react
