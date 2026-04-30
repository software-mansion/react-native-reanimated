#include <reanimated/CSS/core/transition/CSSTransition.h>

#include <memory>
#include <utility>

namespace reanimated::css {

CSSTransition::CSSTransition(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::shared_ptr<std::unordered_set<Tag>> &updatedViewTags,
    const std::shared_ptr<OperationsLoop> &loop,
    const std::shared_ptr<CSSPlatformTransitionProxy> &platformTransitionProxy)
    : shadowNode_(shadowNode),
      viewStylesRepository_(viewStylesRepository),
      updatedViewTags_(updatedViewTags),
      loop_(loop),
      platformTransitionProxy_(platformTransitionProxy) {}

CSSTransition::~CSSTransition() {
  if (loopTransition_) {
    loopTransition_->unschedule();
  }
  if (platformTransition_) {
    platformTransition_->cancelAll();
  }
}

Tag CSSTransition::getViewTag() const {
  return shadowNode_->getTag();
}

ShadowNodeFamily::Shared CSSTransition::getFamilyShared() const {
  return shadowNode_->getFamilyShared();
}

TransitionProperties CSSTransition::collectProperties() const {
  TransitionProperties result;
  result.reserve(routing_.loop.size() + routing_.platform.size());
  result.insert(routing_.loop.begin(), routing_.loop.end());
  result.insert(routing_.platform.begin(), routing_.platform.end());
  return result;
}

folly::dynamic CSSTransition::run(
    jsi::Runtime &rt,
    CSSTransitionConfig &&config,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  const folly::dynamic emptyObject = folly::dynamic::object();
  const folly::dynamic &lastUpdates = lastUpdateValue.empty() ? emptyObject : lastUpdateValue;

  auto processed = platformTransitionProxy_->processConfig(std::move(config), routing_);
  routing_ = std::move(processed.routing);

  folly::dynamic initialUpdate = folly::dynamic::object();
  initialUpdate.update(runLoop(rt, processed.loop, lastUpdates, timestamp));
  initialUpdate.update(runPlatform(rt, processed.platform, timestamp));
  return initialUpdate;
}

folly::dynamic CSSTransition::computeCurrentLoopStyle() {
  if (!loopTransition_) {
    return folly::dynamic::object();
  }
  return loopTransition_->computeCurrentStyle(shadowNode_);
}

folly::dynamic CSSTransition::runLoop(
    jsi::Runtime &rt,
    const CSSTransitionConfig &config,
    const folly::dynamic &lastUpdates,
    const double timestamp) {
  if (!loopTransition_) {
    loopTransition_ = std::make_shared<CSSLoopTransition>(
        shadowNode_->getTag(), shadowNode_->getComponentName(), viewStylesRepository_, updatedViewTags_, loop_);
  }
  return loopTransition_->run(rt, shadowNode_, config, lastUpdates, timestamp);
}

folly::dynamic CSSTransition::runPlatform(jsi::Runtime &rt, const CSSTransitionConfig &config, const double timestamp) {
  if (!platformTransition_) {
    platformTransition_ = std::make_unique<CSSPlatformTransition>(shadowNode_->getTag(), platformTransitionProxy_);
  }
  return platformTransition_->run(rt, config, timestamp);
}

} // namespace reanimated::css
