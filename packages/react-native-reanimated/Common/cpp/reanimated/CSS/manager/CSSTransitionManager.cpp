#include <reanimated/CSS/manager/CSSTransitionManager.h>

namespace reanimated::css {

CSSTransitionManager::CSSTransitionManager(
    const CSSTransitionConfig &config,
    const ShadowNode::Shared &shadowNode,
    std::shared_ptr<OperationsLoop> operationsLoop,
    std::shared_ptr<ViewStylesRepository> viewStylesRepository)
    : transition_(shadowNode, config),
      operationsLoop_(std::move(operationsLoop)),
      viewStylesRepository_(std::move(viewStylesRepository)) {}

folly::dynamic CSSTransitionManager::getCurrentFrameProps() const {
  return transition_.getCurrentFrameProps(viewStylesRepository_);
}

void CSSTransitionManager::updateTransition(
    const PartialCSSTransitionConfig &config) {
  transition_.updateSettings(config);
}

} // namespace reanimated::css
