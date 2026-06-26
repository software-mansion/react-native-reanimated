#include <reanimated/CSS/core/transition/CSSLoopTransition.h>
#include <reanimated/CSS/core/transition/CSSTransition.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <memory>
#include <utility>

namespace reanimated::css {

CSSTransition::CSSTransition(
    std::shared_ptr<const ShadowNode> shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::shared_ptr<CSSPlatformTransitionProxy> &platformTransitionProxy,
    const std::shared_ptr<OperationsLoop> &loop,
    Observer &observer)
    : shadowNode_(std::move(shadowNode)),
      viewStylesRepository_(viewStylesRepository),
      platformTransitionProxy_(platformTransitionProxy),
      loop_(loop),
      observer_(observer) {}

CSSTransition::~CSSTransition() {
  platformTransitionProxy_->cancelAll(getViewTag(), routing_.platform);
}

TransitionProperties CSSTransition::getProperties() const {
  TransitionProperties result = routing_.loop;
  result.insert(routing_.platform.begin(), routing_.platform.end());
  return result;
}

folly::dynamic CSSTransition::run(jsi::Runtime &rt, CSSTransitionConfig &&config, const folly::dynamic &lastUpdates) {
  const auto timestamp = loop_->resolveTimestamp();

  auto loopConfig = platformTransitionProxy_->processConfig(rt, getViewTag(), config, routing_, timestamp);
  if (loopConfig.empty()) {
    return folly::dynamic::object();
  }

  auto &loopTransition = ensureLoopTransition();
  loopTransition.updateSettings(loopConfig.changedPropertiesSettings, loopConfig.removedProperties);

  // Settings-only configs reconfigure without running.
  if (!loopConfig.hasValueUpdates()) {
    return folly::dynamic::object();
  }

  auto initialUpdate = loopTransition.run(rt, shadowNode_, loopConfig.changedProperties, lastUpdates, timestamp);
  scheduleLoop(timestamp);
  return initialUpdate;
}

folly::dynamic CSSTransition::run(
    const PropertyValueDynamicDiffsMap &propertyDiffs,
    const folly::dynamic &lastUpdates) {
  const auto timestamp = loop_->resolveTimestamp();

  auto loopDiffs = platformTransitionProxy_->processDynamicDiffs(getViewTag(), propertyDiffs, routing_, timestamp);
  if (loopDiffs.empty() && !loopTransition_) {
    return folly::dynamic::object();
  }

  auto initialUpdate = ensureLoopTransition().run(shadowNode_, loopDiffs, lastUpdates, timestamp);
  scheduleLoop(timestamp);
  return initialUpdate;
}

folly::dynamic CSSTransition::computeCurrentLoopStyle() {
  if (!loopTransition_) {
    return folly::dynamic::object();
  }
  return loopTransition_->computeCurrentStyle(shadowNode_);
}

void CSSTransition::cancel() {
  if (loopTransition_) {
    loop_->remove(loopTransition_);
  }
  platformTransitionProxy_->cancelAll(getViewTag(), routing_.platform);
}

CSSLoopTransition &CSSTransition::ensureLoopTransition() {
  if (!loopTransition_) {
    loopTransition_ = std::make_shared<CSSLoopTransition>(
        shadowNode_->getTag(),
        shadowNode_->getComponentName(),
        viewStylesRepository_,
        [&observer = observer_](Tag viewTag) { observer.onTransitionUpdate(viewTag); });
  }
  return *loopTransition_;
}

void CSSTransition::scheduleLoop(const double timestamp) {
  loop_->schedule(loopTransition_, timestamp + loopTransition_->getMinDelay(timestamp));
}

} // namespace reanimated::css
