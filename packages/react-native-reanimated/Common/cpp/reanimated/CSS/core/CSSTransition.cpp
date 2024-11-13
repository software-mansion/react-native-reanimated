#include <reanimated/CSS/core/CSSTransition.h>

namespace reanimated {

CSSTransition::CSSTransition(
    ShadowNode::Shared shadowNode,
    const CSSTransitionConfig &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : shadowNode_(std::move(shadowNode)),
      viewStylesRepository_(viewStylesRepository),
      styleInterpolator_(TransitionStyleInterpolator(viewStylesRepository)),
      progressProvider_(TransitionProgressProvider(
          config.duration,
          config.delay,
          config.easingFunction)),
      properties_(config.properties) {}

void CSSTransition::updateSettings(
    const PartialCSSTransitionSettings &settings) {
  if (settings.properties.has_value()) {
    updateTransitionProperties(settings.properties.value());
  }
  if (settings.duration.has_value()) {
    progressProvider_.setDuration(settings.duration.value());
  }
  if (settings.delay.has_value()) {
    progressProvider_.setDelay(settings.delay.value());
  }
  if (settings.easingFunction.has_value()) {
    progressProvider_.setEasingFunction(settings.easingFunction.value());
  }
}

jsi::Value CSSTransition::run(
    jsi::Runtime &rt,
    const ChangedProps &changedProps,
    const double timestamp) {
  styleInterpolator_.updateInterpolatedProperties(rt, changedProps);
  progressProvider_.runProgressProviders(
      rt, timestamp, changedProps.changedPropertyNames);
  // Call update to calculate current interpolation values
  // (e.g. to immediately apply final values for the 0 duration)
  return update(rt, timestamp);
}

jsi::Value CSSTransition::update(jsi::Runtime &rt, const double timestamp) {
  progressProvider_.update(timestamp);

  auto updates = styleInterpolator_.update(
      rt, shadowNode_, progressProvider_.getPropertyProgressProviders());

  return updates;
}

void CSSTransition::updateTransitionProperties(
    const TransitionProperties &properties) {
  properties_ = properties;

  const auto isAllProperties = !properties_.has_value();
  if (isAllProperties) {
    return;
  }

  const std::unordered_set<std::string> transitionPropertyNames(
      properties_->begin(), properties_->end());
  styleInterpolator_.discardIrrelevantInterpolators(transitionPropertyNames);
  progressProvider_.discardIrrelevantProgressProviders(transitionPropertyNames);
}

} // namespace reanimated
