#include <reanimated/CSS/core/CSSTransition.h>

#include <memory>
#include <string>
#include <unordered_set>
#include <utility>

namespace reanimated::css {

CSSTransition::CSSTransition(
    std::shared_ptr<const ShadowNode> shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : shadowNode_(std::move(shadowNode)),
      viewStylesRepository_(viewStylesRepository),
      styleInterpolator_(TransitionStyleInterpolator(shadowNode_->getComponentName(), viewStylesRepository)),
      progressProvider_(TransitionProgressProvider()) {}

Tag CSSTransition::getViewTag() const {
  return shadowNode_->getTag();
}

std::shared_ptr<const ShadowNode> CSSTransition::getShadowNode() const {
  return shadowNode_;
}

double CSSTransition::getMinDelay(double timestamp) const {
  return progressProvider_.getMinDelay(timestamp);
}

TransitionProgressState CSSTransition::getState() const {
  return progressProvider_.getState();
}

folly::dynamic CSSTransition::getCurrentInterpolationStyle() const {
  return styleInterpolator_.interpolate(shadowNode_, progressProvider_, allowDiscreteProperties_);
}

folly::dynamic CSSTransition::run(
    const ChangedProps &changedProps,
    const CSSTransitionPropertiesSettings &settings,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  const auto reversedProperties = styleInterpolator_.updateInterpolatedProperties(changedProps, lastUpdateValue);
  progressProvider_.runProgressProviders(timestamp, settings, changedProps, reversedProperties);
  updateAllowedDiscreteProperties(settings);
  return update(timestamp);
}

folly::dynamic CSSTransition::update(const double timestamp) {
  progressProvider_.update(timestamp);
  auto result = styleInterpolator_.interpolate(shadowNode_, progressProvider_, allowDiscreteProperties_);
  auto removedProperties = progressProvider_.removeFinishedProgressProviders();
  styleInterpolator_.removeListedInterpolators(removedProperties);
  return result;
}

void CSSTransition::updateAllowedDiscreteProperties(const CSSTransitionPropertiesSettings &settings) {
  allowDiscreteProperties_.clear();
  for (const auto &[propertyName, propertySettings] : settings) {
    if (propertySettings.allowDiscrete) {
      allowDiscreteProperties_.insert(propertyName);
    }
  }
}

bool CSSTransition::isAllowedProperty(const std::string &propertyName) const {
  if (!isDiscreteProperty(propertyName, shadowNode_->getComponentName())) {
    return true;
  }

  return allowDiscreteProperties_.contains(propertyName) || allowDiscreteProperties_.contains("all");
}

} // namespace reanimated::css
