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
    loopTransition_->onMilestone(nullptr);
  }
}

TransitionProperties CSSTransition::getProperties() const {
  TransitionProperties result = routing_.loop;
  result.insert(routing_.platform.begin(), routing_.platform.end());
  return result;
}

folly::dynamic CSSTransition::run(jsi::Runtime &rt, CSSTransitionConfig &&config, const folly::dynamic &lastUpdates) {
  const auto timestamp = loop_->resolveTimestamp();

  for (const auto &propertyName : pseudoLockedProperties_) {
    config.changedPropertiesSettings.erase(propertyName);
    config.changedProperties.erase(propertyName);
    std::erase(config.removedProperties, propertyName);
  }

  auto loopConfig = platformTransitionProxy_->processConfig(rt, getViewTag(), config, routing_, timestamp);

  const auto platformRuns = platformRunProperties(config);
  const bool hasTrackedRemovals = eventMask_ != 0 && loopTransition_ && !config.removedProperties.empty();
  if (loopConfig.empty() && platformRuns.empty() && !hasTrackedRemovals) {
    return folly::dynamic::object();
  }

  auto &loopTransition = ensureLoopTransition();
  loopTransition.updateSettings(loopConfig.changedPropertiesSettings, loopConfig.removedProperties);

  if (hasTrackedRemovals) {
    loopTransition.removeProperties(config.removedProperties);
  }

  if (!platformRuns.empty()) {
    // TODO: add support for events reported by the platform itself; until
    // then the lifecycle of platform-routed properties temporarily runs on
    // the loop path.
    PropertiesSettingsMap platformSettings;
    for (const auto &propertyName : platformRuns) {
      platformSettings.emplace(propertyName, config.changedPropertiesSettings.at(propertyName));
    }
    loopTransition.trackProperties(platformSettings, platformRuns, timestamp);
  }

  folly::dynamic initialUpdate = folly::dynamic::object();
  // Settings-only configs reconfigure without running.
  if (loopConfig.hasValueUpdates()) {
    initialUpdate = loopTransition.run(rt, shadowNode_, loopConfig.changedProperties, lastUpdates, timestamp);
  }
  if (loopConfig.hasValueUpdates() || !platformRuns.empty()) {
    scheduleLoop(timestamp);
  }
  return initialUpdate;
}

std::vector<std::string> CSSTransition::platformRunProperties(const CSSTransitionConfig &config) const {
  std::vector<std::string> result;
  if (eventMask_ == 0) {
    return result;
  }
  for (const auto &[propertyName, value] : config.changedProperties) {
    if (routing_.platform.contains(propertyName)) {
      result.push_back(propertyName);
    }
  }
  return result;
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

void CSSTransition::setPseudoLockedProperties(TransitionProperties properties) {
  pseudoLockedProperties_ = std::move(properties);
}

void CSSTransition::cancel() {
  if (loopTransition_) {
    loop_->remove(loopTransition_);
  }
  platformTransitionProxy_->cancelAll(getViewTag(), routing_.platform);
}

void CSSTransition::removeProperties(const std::vector<std::string> &propertyNames) {
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
    loopTransition_->removeProperties(propertyNames);
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
    loopTransition.onMilestone(nullptr);
    return;
  }

  loopTransition.onMilestone(
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
