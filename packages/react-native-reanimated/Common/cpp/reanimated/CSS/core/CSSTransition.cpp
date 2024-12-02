#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/core/CSSTransition.h>

namespace reanimated {

CSSTransition::CSSTransition(
    ShadowNode::Shared shadowNode,
    const CSSTransitionConfig &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : shadowNode_(std::move(shadowNode)),
      properties_(config.properties),
      allowDiscrete_(config.allowDiscrete),
      viewStylesRepository_(viewStylesRepository),
      progressProvider_(TransitionProgressProvider(config.settings)),
      styleInterpolator_(TransitionStyleInterpolator(viewStylesRepository)) {}

Tag CSSTransition::getViewTag() const {
  return shadowNode_->getTag();
}

ShadowNode::Shared CSSTransition::getShadowNode() const {
  return shadowNode_;
}

const TransitionProperties &CSSTransition::getProperties() const {
  return properties_;
}

bool CSSTransition::getAllowDiscrete() const {
  return allowDiscrete_;
}

double CSSTransition::getMinDelay(double timestamp) const {
  return progressProvider_.getMinDelay(timestamp);
}

TransitionProgressState CSSTransition::getState() const {
  return progressProvider_.getState();
}

jsi::Value CSSTransition::getCurrentInterpolationStyle(jsi::Runtime &rt) const {
  return styleInterpolator_.getCurrentInterpolationStyle(rt, shadowNode_);
}

void CSSTransition::updateSettings(const PartialCSSTransitionConfig &config) {
  if (config.properties.has_value()) {
    updateTransitionProperties(config.properties.value());
  }
  if (config.allowDiscrete.has_value()) {
    allowDiscrete_ = config.allowDiscrete.value();
  }
  if (config.settings.has_value()) {
    progressProvider_.setSettings(config.settings.value());
  }
}

jsi::Value CSSTransition::run(
    jsi::Runtime &rt,
    const ChangedProps &changedProps,
    const double timestamp) {
  progressProvider_.runProgressProviders(
      timestamp, changedProps.changedPropertyNames);
  styleInterpolator_.updateInterpolatedProperties(
      rt, changedProps, progressProvider_.getPropertyProgressProviders());
  return update(rt, timestamp);
}

jsi::Value CSSTransition::update(jsi::Runtime &rt, const double timestamp) {
  progressProvider_.update(timestamp);
  return styleInterpolator_.update(
      rt, shadowNode_, progressProvider_.getRemovedProperties());
}

void CSSTransition::updateTransitionProperties(
    const TransitionProperties &properties) {
  properties_ = properties;

  const auto isAllPropertiesTransition = !properties_.has_value();
  if (isAllPropertiesTransition) {
    return;
  }

  const std::unordered_set<std::string> transitionPropertyNames(
      properties_->begin(), properties_->end());
  styleInterpolator_.discardIrrelevantInterpolators(transitionPropertyNames);
  progressProvider_.discardIrrelevantProgressProviders(transitionPropertyNames);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
