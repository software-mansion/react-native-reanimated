#include <reanimated/CSS/core/CSSTransition.h>

namespace reanimated::css {

CSSTransition::CSSTransition(const CSSTransitionConfig &config)
    : properties_(config.properties),
      settings_(config.settings),
      progressProvider_(TransitionProgressProvider()),
      styleInterpolator_(TransitionStyleInterpolator()) {}

double CSSTransition::getMinDelay(const double timestamp) const {
  return progressProvider_.getMinDelay(timestamp);
}

TransitionProgressState CSSTransition::getState() const {
  return progressProvider_.getState();
}

TransitionProperties CSSTransition::getProperties() const {
  return properties_;
}

PropertyNames CSSTransition::getAllowedProperties(
    const folly::dynamic &oldProps,
    const folly::dynamic &newProps) {
  if (!oldProps.isObject() || !newProps.isObject()) {
    return {};
  }

  // If specific properties are set, process only those
  if (properties_.has_value()) {
    PropertyNames allowedProps;
    const auto &properties = properties_.value();
    allowedProps.reserve(properties.size());

    for (const auto &prop : properties) {
      if (isAllowedProperty(prop)) {
        allowedProps.push_back(prop);
      }
    }

    return allowedProps;
  }

  // Process all properties from both old and new props
  std::unordered_set<std::string> allAllowedProps;

  for (const auto &props : {oldProps, newProps}) {
    for (const auto &propertyName : props.keys()) {
      if (isAllowedProperty(propertyName.asString())) {
        allAllowedProps.insert(propertyName.asString());
      }
    }
  }

  return {allAllowedProps.begin(), allAllowedProps.end()};
}

folly::dynamic CSSTransition::getCurrentFrameProps(
    const ShadowNode::Shared &shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const {
  return styleInterpolator_.interpolate(
      shadowNode, progressProvider_, viewStylesRepository);
}

void CSSTransition::updateSettings(const CSSTransitionConfigUpdates &config) {
  if (config.properties.has_value()) {
    updateTransitionProperties(config.properties.value());
  }
  if (config.settings.has_value()) {
    settings_ = config.settings.value();
  }
}

void CSSTransition::run(
    const double timestamp,
    const ChangedProps &changedProps,
    const folly::dynamic &lastUpdateValue) {
  progressProvider_.runProgressProviders(
      timestamp,
      settings_,
      changedProps.changedPropertyNames,
      styleInterpolator_.getReversedPropertyNames(changedProps.newProps));
  styleInterpolator_.updateInterpolatedProperties(
      changedProps, lastUpdateValue);
}

void CSSTransition::update(const double timestamp) {
  progressProvider_.update(timestamp);
  // Remove interpolators for which interpolation has finished
  // (we won't need them anymore in the current transition)
  styleInterpolator_.discardFinishedInterpolators(progressProvider_);
  // And remove finished progress providers after they were used to calculate
  // the last frame of the transition
  progressProvider_.discardFinishedProgressProviders();
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

bool CSSTransition::isAllowedProperty(const std::string &propertyName) const {
  if (!isDiscreteProperty(propertyName)) {
    return true;
  }

  const auto &propertySettings =
      getTransitionPropertySettings(settings_, propertyName);

  if (!propertySettings.has_value()) {
    return false;
  }
  return propertySettings.value().allowDiscrete;
}

} // namespace reanimated::css
