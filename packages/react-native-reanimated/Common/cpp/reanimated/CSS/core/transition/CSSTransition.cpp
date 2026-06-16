#include <reanimated/CSS/core/transition/CSSLoopTransition.h>
#include <reanimated/CSS/core/transition/CSSTransition.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <memory>
#include <utility>
#include <vector>

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
  if (platformTransition_) {
    platformTransition_->cancelAll();
  }
}

TransitionProperties CSSTransition::getProperties() const {
  TransitionProperties result = routing_.loop;
  result.reserve(routing_.loop.size() + routing_.platform.size());
  result.insert(routing_.platform.begin(), routing_.platform.end());
  return result;
}

folly::dynamic CSSTransition::run(jsi::Runtime &rt, CSSTransitionConfig &&config, const folly::dynamic &lastUpdates) {
  const auto timestamp = loop_->resolveTimestamp();

  // CSSTransition owns routing: platform-routed props run immediately on the platform
  // transition; the loop-routed remainder is applied to the loop transition below.
  auto processed = platformTransitionProxy_->processConfig(std::move(config), routing_);
  routing_ = std::move(processed.routing);

  if (!processed.platform.empty()) {
    auto &platformTransition = ensurePlatformTransition();
    platformTransition.updateSettings(
        processed.platform.changedPropertiesSettings, processed.platform.removedProperties);
    platformTransition.run(rt, processed.platform, timestamp);
  }

  const auto &loopConfig = processed.loop;
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

  PropertyValueDynamicDiffsMap loopDiffs;
  PropertyValueDynamicDiffsMap platformDiffs;
  for (const auto &[propertyName, propertyDiff] : propertyDiffs) {
    if (routing_.platform.contains(propertyName)) {
      platformDiffs.emplace(propertyName, propertyDiff);
    } else {
      loopDiffs.emplace(propertyName, propertyDiff);
    }
  }

  if (!platformDiffs.empty()) {
    ensurePlatformTransition().run(platformDiffs, timestamp);
  }
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
  if (platformTransition_) {
    platformTransition_->cancelAll();
  }
}

CSSPlatformTransition &CSSTransition::ensurePlatformTransition() {
  if (!platformTransition_) {
    platformTransition_ = std::make_unique<CSSPlatformTransition>(shadowNode_->getTag(), platformTransitionProxy_);
  }
  return *platformTransition_;
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
