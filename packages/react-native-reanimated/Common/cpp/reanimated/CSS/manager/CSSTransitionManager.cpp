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
  const auto &newConfig = newProps.cssTransition;

  if (!transition_) {
    if (!newConfig.empty()) {
      createTransition(newConfig);
    }
  } else if (newConfig.empty()) {
    removeTransition();
    return;
  }

  // TODO - improve not to compare dynamics
  const auto &oldConfig = oldProps.cssTransition;
  if (newConfig != oldConfig) {
    LOG(INFO) << "update transition settings";
  }

  // TODO - get transition props and check if the transition should be triggered
}

void CSSTransitionManager::createTransition(const folly::dynamic &config) {
  transition_ = CSSTransition(parseCSSTransitionConfig(config));
}

void CSSTransitionManager::removeTransition() {
  operationsLoop_->remove(operationHandle_);
  transition_ = std::nullopt;
}

void CSSTransitionManager::scheduleOrActivateTransition(
    const CSSTransition &transition) {}

} // namespace reanimated::css
