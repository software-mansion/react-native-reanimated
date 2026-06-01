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
    Observer &observer,
    const std::shared_ptr<CSSPlatformTransitionProxy> &platformTransitionProxy)
    : shadowNode_(std::move(shadowNode)),
      loopTransition_(std::make_shared<CSSLoopTransition>(
          shadowNode_->getTag(),
          shadowNode_->getComponentName(),
          viewStylesRepository,
          observer)),
      platformTransitionProxy_(platformTransitionProxy) {}

CSSTransition::~CSSTransition() {
  if (platformTransition_) {
    platformTransition_->cancelAll();
  }
}

TransitionProperties CSSTransition::getProperties() const {
  // Loop-side properties are tracked by the loop transition; merge in any
  // routed-to-platform names so callers see the full set.
  TransitionProperties result = loopTransition_->getProperties();
  result.insert(routing_.platform.begin(), routing_.platform.end());
  return result;
}

double CSSTransition::getMinDelay(double timestamp) const {
  return loopTransition_->getMinDelay(timestamp);
}

TransitionProgressState CSSTransition::getState() const {
  return loopTransition_->getState();
}

void CSSTransition::schedule(OperationsLoop &loop) {
  const auto timestamp = loop.resolveTimestamp();
  loop.schedule(loopTransition_, timestamp + loopTransition_->getMinDelay(timestamp));
}

void CSSTransition::unschedule(OperationsLoop &loop) {
  loop.remove(loopTransition_);
}

folly::dynamic CSSTransition::run(
    jsi::Runtime &rt,
    const PropertyValueDiffsMap &propertiesDiffs,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  return loopTransition_->run(rt, shadowNode_, propertiesDiffs, lastUpdateValue, timestamp);
}

folly::dynamic CSSTransition::run(
    const PropertyValueDynamicDiffsMap &propertiesDiffs,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  return loopTransition_->run(shadowNode_, propertiesDiffs, lastUpdateValue, timestamp);
}

void CSSTransition::updateSettings(
    const PropertiesSettingsMap &changedPropertiesSettings,
    const std::vector<std::string> &removedProperties) {
  loopTransition_->updateSettings(changedPropertiesSettings, removedProperties);
}

CSSTransitionConfig
CSSTransition::splitForPlatformRouting(jsi::Runtime &rt, CSSTransitionConfig &&config, const double timestamp) {
  auto processed = platformTransitionProxy_->processConfig(std::move(config), routing_);
  routing_ = std::move(processed.routing);

  if (!processed.platform.changedProperties.empty() || !processed.platform.removedProperties.empty()) {
    ensurePlatformTransition().run(rt, processed.platform, timestamp);
  }

  return std::move(processed.loop);
}

folly::dynamic CSSTransition::computeCurrentStyle() {
  return loopTransition_->computeCurrentStyle(shadowNode_);
}

CSSPlatformTransition &CSSTransition::ensurePlatformTransition() {
  if (!platformTransition_) {
    platformTransition_ = std::make_unique<CSSPlatformTransition>(shadowNode_->getTag(), platformTransitionProxy_);
  }
  return *platformTransition_;
}

} // namespace reanimated::css
