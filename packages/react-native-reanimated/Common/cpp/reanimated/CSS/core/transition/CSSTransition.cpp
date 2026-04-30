#include <reanimated/CSS/core/transition/CSSTransition.h>

#include <memory>
#include <utility>

namespace reanimated::css {

CSSTransition::CSSTransition(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::shared_ptr<std::unordered_set<Tag>> &updatedViewTags,
    const std::shared_ptr<OperationsLoop> &loop)
    : shadowNode_(shadowNode),
      loopTransition_(std::make_shared<CSSLoopTransition>(
          shadowNode->getTag(),
          shadowNode->getComponentName(),
          viewStylesRepository,
          updatedViewTags,
          loop)) {}

CSSTransition::~CSSTransition() {
  loopTransition_->unschedule();
}

Tag CSSTransition::getViewTag() const {
  return shadowNode_->getTag();
}

ShadowNodeFamily::Shared CSSTransition::getFamilyShared() const {
  return shadowNode_->getFamilyShared();
}

TransitionProperties CSSTransition::getProperties() const {
  return loopTransition_->getProperties();
}

folly::dynamic CSSTransition::run(
    jsi::Runtime &rt,
    const CSSTransitionConfig &config,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  return loopTransition_->run(rt, shadowNode_, config, lastUpdateValue, timestamp);
}

folly::dynamic CSSTransition::computeCurrentStyle() {
  return loopTransition_->computeCurrentStyle(shadowNode_);
}

} // namespace reanimated::css
