#include <reanimated/CSS/core/transition/CSSLoopTransition.h>
#include <reanimated/CSS/core/transition/CSSTransition.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <jsi/JSIDynamic.h>

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

  for (const auto &propertyName : pseudoLockedProperties_) {
    config.changedPropertiesSettings.erase(propertyName);
    config.changedProperties.erase(propertyName);
    std::erase(config.removedProperties, propertyName);
  }

  auto loopConfig = platformTransitionProxy_->processConfig(rt, getViewTag(), config, routing_, timestamp);

  auto initialUpdate = collectPlatformTargets(rt, config);

  if (!loopConfig.empty()) {
    auto &loopTransition = ensureLoopTransition();
    loopTransition.updateSettings(loopConfig.changedPropertiesSettings, loopConfig.removedProperties);
    // Settings-only configs reconfigure without running.
    if (loopConfig.hasValueUpdates()) {
      initialUpdate.update(loopTransition.run(rt, shadowNode_, loopConfig.changedProperties, lastUpdates, timestamp));
      scheduleLoop(timestamp);
    }
  }

  return initialUpdate;
}

folly::dynamic CSSTransition::run(
    const PropertyValueDynamicDiffsMap &propertyDiffs,
    const folly::dynamic &lastUpdates) {
  const auto timestamp = loop_->resolveTimestamp();

  auto loopDiffs = platformTransitionProxy_->processDynamicDiffs(getViewTag(), propertyDiffs, routing_, timestamp);

  auto initialUpdate = collectPlatformTargets(propertyDiffs);

  if (!loopDiffs.empty() || loopTransition_) {
    initialUpdate.update(ensureLoopTransition().run(shadowNode_, loopDiffs, lastUpdates, timestamp));
    scheduleLoop(timestamp);
  }

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

folly::dynamic CSSTransition::collectPlatformTargets(jsi::Runtime &rt, const CSSTransitionConfig &config) const {
  folly::dynamic targets = folly::dynamic::object;
  for (const auto &[propertyName, valueDiff] : config.changedProperties) {
    if (routing_.platform.contains(propertyName)) {
      targets[propertyName] = dynamicFromValue(rt, valueDiff.second);
    }
  }
  return targets;
}

folly::dynamic CSSTransition::collectPlatformTargets(const PropertyValueDynamicDiffsMap &propertyDiffs) const {
  folly::dynamic targets = folly::dynamic::object;
  for (const auto &[propertyName, valueDiff] : propertyDiffs) {
    if (routing_.platform.contains(propertyName)) {
      targets[propertyName] = valueDiff.second;
    }
  }
  return targets;
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
