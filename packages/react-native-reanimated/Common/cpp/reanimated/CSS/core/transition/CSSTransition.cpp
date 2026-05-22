#include <reanimated/CSS/core/transition/CSSLoopTransition.h>
#include <reanimated/CSS/core/transition/CSSTransition.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSTransition::CSSTransition(
    std::shared_ptr<const ShadowNode> shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    Observer &observer)
    : shadowNode_(std::move(shadowNode)),
      loopTransition_(std::make_shared<CSSLoopTransition>(
          shadowNode_->getTag(),
          shadowNode_->getComponentName(),
          viewStylesRepository,
          observer)) {}

TransitionProperties CSSTransition::getProperties() const {
  return loopTransition_->getProperties();
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

folly::dynamic CSSTransition::computeCurrentStyle() {
  return loopTransition_->computeCurrentStyle(shadowNode_);
}

} // namespace reanimated::css
