#include <reanimated/CSS/manager/CSSTransitionManager.h>

namespace reanimated::css {

CSSTransitionManager::CSSTransitionManager(
    std::shared_ptr<OperationsLoop> operationsLoop,
    std::shared_ptr<ViewStylesRepository> viewStylesRepository)
    : operationsLoop_(std::move(operationsLoop)),
      viewStylesRepository_(std::move(viewStylesRepository)) {}

folly::dynamic CSSTransitionManager::getCurrentFrameProps() const {
  if (!transition_) {
    return folly::dynamic();
  }
  return transition_->getCurrentFrameProps(viewStylesRepository_);
}

} // namespace reanimated::css
