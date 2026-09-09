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
  if (loopTransition_) {
    // The loop co-owns the transition and removal is only enqueued, so a frame
    // already in flight can still tick it after we are gone. Drop the reporter
    // so that tick has nothing to call back into.
    loopTransition_->setMilestoneReporter(nullptr);
  }
}

TransitionProperties CSSTransition::getLoopProperties() const {
  return routing_.loop;
}

folly::dynamic CSSTransition::run(jsi::Runtime &rt, CSSTransitionConfig &&config, const folly::dynamic &lastUpdates) {
  const auto timestamp = loop_->resolveTimestamp();

  for (const auto &propertyName : pseudoLockedProperties_) {
    config.changedPropertiesSettings.erase(propertyName);
    config.changedProperties.erase(propertyName);
    std::erase(config.removedProperties, propertyName);
  }

  // TODO: add support for events reported by the platform itself; until then
  // a view with transition callbacks keeps every property on the loop, where
  // timing and events already pair up.
  auto loopConfig =
      platformTransitionProxy_->processConfig(rt, getViewTag(), config, routing_, eventMask_ == 0, timestamp);

  if (!loopConfig.empty()) {
    dropPending(loopConfig.removedProperties);
    ensureLoopTransition().updateSettings(
        loopConfig.changedPropertiesSettings, loopConfig.removedProperties, timestamp);
  }

  // Settings-only configs reconfigure without running.
  if (!loopConfig.hasValueUpdates()) {
    return folly::dynamic::object();
  }

  auto initialUpdate =
      ensureLoopTransition().run(rt, shadowNode_, loopConfig.changedProperties, lastUpdates, timestamp);
  scheduleLoop(timestamp);
  pendingInitialUpdate_.update(initialUpdate);
  return initialUpdate;
}

folly::dynamic CSSTransition::run(
    const PropertyValueDynamicDiffsMap &propertyDiffs,
    const folly::dynamic &lastUpdates) {
  const auto timestamp = loop_->resolveTimestamp();

  auto loopDiffs = platformTransitionProxy_->processDynamicDiffs(
      getViewTag(), propertyDiffs, pseudoLockedProperties_, routing_, eventMask_ == 0, timestamp);
  if (loopDiffs.empty() && !loopTransition_) {
    return folly::dynamic::object();
  }

  auto initialUpdate = ensureLoopTransition().run(shadowNode_, loopDiffs, lastUpdates, timestamp);
  scheduleLoop(timestamp);
  pendingInitialUpdate_.update(initialUpdate);
  return initialUpdate;
}

folly::dynamic CSSTransition::takeUpdates() {
  auto updates = std::exchange(pendingInitialUpdate_, folly::dynamic::object());
  if (loopTransition_) {
    updates.update(loopTransition_->computeCurrentStyle(shadowNode_));
  }
  return updates;
}

void CSSTransition::dropPending(const std::vector<std::string> &propertyNames) {
  for (const auto &propertyName : propertyNames) {
    pendingInitialUpdate_.erase(propertyName);
  }
}

void CSSTransition::setPseudoLockedProperties(TransitionProperties properties) {
  pseudoLockedProperties_ = std::move(properties);
}

void CSSTransition::cancel() {
  pendingInitialUpdate_ = folly::dynamic::object();
  if (loopTransition_) {
    // Report the cancel before the operation goes away, as animations do.
    loopTransition_->abort(loop_->resolveTimestamp());
    loop_->remove(loopTransition_);
  }
  platformTransitionProxy_->cancelAll(getViewTag(), routing_.platform);
}

void CSSTransition::removeProperties(const std::vector<std::string> &propertyNames, const double timestamp) {
  dropPending(propertyNames);

  TransitionProperties platformProperties;
  for (const auto &propertyName : propertyNames) {
    if (routing_.platform.erase(propertyName) > 0) {
      platformProperties.insert(propertyName);
    }
    routing_.loop.erase(propertyName);
  }

  if (!platformProperties.empty()) {
    platformTransitionProxy_->cancelAll(getViewTag(), platformProperties);
  }
  if (loopTransition_) {
    loopTransition_->removeProperties(propertyNames, timestamp);
  }
}

CSSLoopTransition &CSSTransition::ensureLoopTransition() {
  if (!loopTransition_) {
    loopTransition_ = std::make_shared<CSSLoopTransition>(
        shadowNode_->getTag(),
        shadowNode_->getComponentName(),
        viewStylesRepository_,
        [&observer = observer_](Tag viewTag) { observer.onTransitionUpdate(viewTag); });
    observeMilestones(*loopTransition_);
  }
  return *loopTransition_;
}

void CSSTransition::setEventMask(const CSSEventMask eventMask) {
  if (eventMask == eventMask_) {
    return;
  }
  eventMask_ = eventMask;

  if (loopTransition_) {
    observeMilestones(*loopTransition_);
  }
}

void CSSTransition::observeMilestones(CSSLoopTransition &loopTransition) {
  if (eventMask_ == 0) {
    loopTransition.setMilestoneReporter(nullptr);
    return;
  }

  loopTransition.setMilestoneReporter(
      [this](const RunMilestone milestone, const std::string &propertyName, const double elapsedTime) {
        reportMilestone(milestone, propertyName, elapsedTime);
      });
}

void CSSTransition::reportMilestone(
    const RunMilestone milestone,
    const std::string &propertyName,
    const double elapsedTime) {
  switch (milestone) {
    case RunMilestone::Created:
      emitEvent(CSSEventType::TransitionRun, propertyName, elapsedTime);
      break;
    case RunMilestone::Started:
      emitEvent(CSSEventType::TransitionStart, propertyName, elapsedTime);
      break;
    case RunMilestone::Ended:
      emitEvent(CSSEventType::TransitionEnd, propertyName, elapsedTime);
      break;
    case RunMilestone::Aborted:
      emitEvent(CSSEventType::TransitionCancel, propertyName, elapsedTime);
      break;
    case RunMilestone::Repeated:
      // A transition runs once, so it never repeats.
      break;
  }
}

void CSSTransition::emitEvent(const CSSEventType type, const std::string &propertyName, const double elapsedTime)
    const {
  if (!hasListener(eventMask_, type)) {
    return;
  }
  observer_.onTransitionEvent(shadowNode_->getTag(), propertyName, type, elapsedTime);
}

void CSSTransition::scheduleLoop(const double timestamp) {
  loop_->schedule(loopTransition_, timestamp + loopTransition_->getMinDelay(timestamp));
}

} // namespace reanimated::css
