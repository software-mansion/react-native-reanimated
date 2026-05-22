#include <reanimated/CSS/core/transition/CSSLoopTransition.h>
#include <reanimated/CSS/core/transition/CSSTransition.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <memory>
#include <utility>

namespace reanimated::css {

CSSTransition::CSSTransition(
    std::shared_ptr<const ShadowNode> shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    Observer &observer,
    const std::shared_ptr<CSSPlatformTransitionProxy> &platformTransitionProxy)
    : shadowNode_(std::move(shadowNode)),
      viewStylesRepository_(viewStylesRepository),
      observer_(observer),
      platformTransitionProxy_(platformTransitionProxy) {}

CSSTransition::~CSSTransition() {
  if (platformTransition_) {
    platformTransition_->cancelAll();
  }
}

TransitionProperties CSSTransition::getProperties() const {
  TransitionProperties result;
  result.reserve(routing_.loop.size() + routing_.platform.size());
  result.insert(routing_.loop.begin(), routing_.loop.end());
  result.insert(routing_.platform.begin(), routing_.platform.end());
  return result;
}

double CSSTransition::getMinDelay(double timestamp) const {
  return loopTransition_ ? loopTransition_->getMinDelay(timestamp) : 0;
}

TransitionProgressState CSSTransition::getState() const {
  return loopTransition_ ? loopTransition_->getState() : TransitionProgressState::Idle;
}

void CSSTransition::schedule(OperationsLoop &loop) {
  if (!loopTransition_) {
    return;
  }
  const auto timestamp = loop.resolveTimestamp();
  loop.schedule(loopTransition_, timestamp + loopTransition_->getMinDelay(timestamp));
}

void CSSTransition::unschedule(OperationsLoop &loop) {
  if (loopTransition_) {
    loop.remove(loopTransition_);
  }
}

folly::dynamic CSSTransition::run(
    jsi::Runtime &rt,
    CSSTransitionConfig &&config,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  const folly::dynamic emptyObject = folly::dynamic::object();
  const folly::dynamic &lastUpdates = lastUpdateValue.empty() ? emptyObject : lastUpdateValue;

  auto processed = platformTransitionProxy_->processConfig(rt, shadowNode_->getTag(), std::move(config), routing_);
  routing_ = std::move(processed.routing);

  folly::dynamic initialUpdate = folly::dynamic::object();
  initialUpdate.update(runLoop(rt, processed.loop, lastUpdates, timestamp));
  initialUpdate.update(runPlatform(processed.platform));
  return initialUpdate;
}

folly::dynamic CSSTransition::run(
    const PropertyValueDynamicDiffsMap &propertiesDiffs,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  // The dynamic path is used by `PseudoStylesRegistry` only; pseudo-driven
  // transitions always stay on the loop side, so we skip the proxy entirely.
  if (!loopTransition_) {
    loopTransition_ = std::make_shared<CSSLoopTransition>(
        shadowNode_->getTag(), shadowNode_->getComponentName(), viewStylesRepository_, observer_);
  }
  for (const auto &[propertyName, _] : propertiesDiffs) {
    routing_.loop.insert(propertyName);
  }
  return loopTransition_->run(shadowNode_, propertiesDiffs, lastUpdateValue, timestamp);
}

void CSSTransition::updateSettings(
    const PropertiesTimingSettingsMap &changedPropertiesSettings,
    const std::vector<std::string> &removedProperties) {
  if (!loopTransition_) {
    loopTransition_ = std::make_shared<CSSLoopTransition>(
        shadowNode_->getTag(), shadowNode_->getComponentName(), viewStylesRepository_, observer_);
  }
  for (const auto &propertyName : removedProperties) {
    routing_.loop.erase(propertyName);
  }
  loopTransition_->updateSettings(changedPropertiesSettings, removedProperties);
}

folly::dynamic CSSTransition::computeCurrentStyle() {
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
        shadowNode_->getTag(), shadowNode_->getComponentName(), viewStylesRepository_, observer_);
  }
  return loopTransition_->run(rt, shadowNode_, config, lastUpdates, timestamp);
}

folly::dynamic CSSTransition::runPlatform(const CSSPlatformTransitionConfig &config) {
  if (!platformTransition_) {
    platformTransition_ = std::make_unique<CSSPlatformTransition>(shadowNode_->getTag(), platformTransitionProxy_);
  }
  return platformTransition_->run(config);
}

} // namespace reanimated::css
