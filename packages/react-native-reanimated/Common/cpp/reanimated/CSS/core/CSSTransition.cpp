#include <reanimated/CSS/core/CSSTransition.h>

#include <memory>
#include <string>
#include <unordered_set>
#include <utility>

namespace reanimated::css {

CSSTransition::CSSTransition(
    std::shared_ptr<const ShadowNode> shadowNode,
    const CSSTransitionConfig &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : shadowNode_(std::move(shadowNode)),
      viewStylesRepository_(viewStylesRepository),
      properties_(config.changedProperties.empty() ? std::nullopt : [&config]() {
        PropertyNames propertyNames;
        propertyNames.reserve(config.changedProperties.size());
        for (const auto &[key, _] : config.changedProperties) {
          propertyNames.emplace_back(key);
        }
        return std::make_optional(propertyNames);
      }()),
      settings_(config.changedProperties),
      styleInterpolator_(TransitionStyleInterpolator(shadowNode_->getComponentName(), viewStylesRepository)),
      progressProvider_(TransitionProgressProvider()) {
  updateAllowedDiscreteProperties();
}

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

TransitionProperties CSSTransition::getProperties() const {
  return properties_;
}

PropertyNames CSSTransition::getAllowedProperties(const folly::dynamic &oldProps, const folly::dynamic &newProps) {
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

void CSSTransition::updateSettings(const CSSTransitionConfig &config) {
  // Update changed properties
  if (!config.changedProperties.empty()) {
    PropertyNames propertyNames;
    propertyNames.reserve(config.changedProperties.size());
    for (const auto &[key, _] : config.changedProperties) {
      propertyNames.emplace_back(key);
    }
    updateTransitionProperties(std::make_optional(propertyNames));
    settings_ = config.changedProperties;
    updateAllowedDiscreteProperties();
  }
  // Handle removed properties - remove them from current settings
  for (const auto &removedProp : config.removedProperties) {
    settings_.erase(removedProp);
  }
  // Update properties list if settings changed
  if (!settings_.empty()) {
    PropertyNames currentProperties;
    currentProperties.reserve(settings_.size());
    for (const auto &[key, _] : settings_) {
      currentProperties.emplace_back(key);
    }
    updateTransitionProperties(std::make_optional(currentProperties));
  } else {
    updateTransitionProperties(std::nullopt);
  }
}

folly::dynamic
CSSTransition::run(const ChangedProps &changedProps, const folly::dynamic &lastUpdateValue, const double timestamp) {
  const auto reversedProperties = styleInterpolator_.updateInterpolatedProperties(changedProps, lastUpdateValue);
  progressProvider_.runProgressProviders(timestamp, settings_, changedProps.changedPropertyNames, reversedProperties);
  return update(timestamp);
}

folly::dynamic CSSTransition::update(const double timestamp) {
  progressProvider_.update(timestamp);
  auto result = styleInterpolator_.interpolate(shadowNode_, progressProvider_, allowDiscreteProperties_);
  // Remove interpolators for which interpolation has finished
  // (we won't need them anymore in the current transition)
  styleInterpolator_.discardFinishedInterpolators(progressProvider_);
  // And remove finished progress providers after they were used to calculate
  // the last frame of the transition
  progressProvider_.discardFinishedProgressProviders();
  return result;
}

void CSSTransition::updateTransitionProperties(const TransitionProperties &properties) {
  properties_ = properties;

  const auto isAllPropertiesTransition = !properties_.has_value();
  if (isAllPropertiesTransition) {
    return;
  }

  const std::unordered_set<std::string> transitionPropertyNames(properties_->begin(), properties_->end());

  styleInterpolator_.discardIrrelevantInterpolators(transitionPropertyNames);
  progressProvider_.discardIrrelevantProgressProviders(transitionPropertyNames);
}

void CSSTransition::updateAllowedDiscreteProperties() {
  allowDiscreteProperties_.clear();
  for (const auto &[propertyName, propertySettings] : settings_) {
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
