#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/core/CSSTransition.h>

namespace reanimated {

CSSTransition::CSSTransition(
    ShadowNode::Shared shadowNode,
    const CSSTransitionConfig &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : shadowNode_(std::move(shadowNode)),
      viewStylesRepository_(viewStylesRepository),
      properties_(config.properties),
      settings_(config.settings),
      progressProvider_(TransitionProgressProvider()),
      styleInterpolator_(TransitionStyleInterpolator(viewStylesRepository)) {}

Tag CSSTransition::getViewTag() const {
  return shadowNode_->getTag();
}

ShadowNode::Shared CSSTransition::getShadowNode() const {
  return shadowNode_;
}

double CSSTransition::getMinDelay(double timestamp) const {
  return progressProvider_.getMinDelay(timestamp);
}

TransitionProgressState CSSTransition::getState() const {
  return progressProvider_.getState();
}

jsi::Value CSSTransition::getCurrentInterpolationStyle(jsi::Runtime &rt) const {
  return styleInterpolator_.getCurrentInterpolationStyle(
      rt, shadowNode_, progressProvider_);
}

PropertyNames CSSTransition::getAllowedProperties(
    jsi::Runtime &rt,
    const jsi::Value &oldProps,
    const jsi::Value &newProps) {
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

  auto processProps = [&](const jsi::Object &propsObj) {
    const auto &propertyNames = propsObj.getPropertyNames(rt);
    const size_t size = propertyNames.size(rt);

    for (size_t i = 0; i < size; i++) {
      const auto &propertyName =
          propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
      if (isAllowedProperty(propertyName)) {
        allAllowedProps.insert(propertyName);
      }
    }
  };

  processProps(oldProps.asObject(rt));
  processProps(newProps.asObject(rt));

  return {allAllowedProps.begin(), allAllowedProps.end()};
}

void CSSTransition::updateSettings(const PartialCSSTransitionConfig &config) {
  if (config.properties.has_value()) {
    updateTransitionProperties(config.properties.value());
  }
  if (config.settings.has_value()) {
    settings_ = config.settings.value();
  }
}

jsi::Value CSSTransition::run(
    jsi::Runtime &rt,
    const ChangedProps &changedProps,
    const double timestamp) {
  progressProvider_.runProgressProviders(
      timestamp,
      settings_,
      changedProps.changedPropertyNames,
      styleInterpolator_.getReversedPropertyNames(rt, changedProps.newProps));
  styleInterpolator_.updateInterpolatedProperties(
      rt,
      changedProps,
      jsi::Value::undefined(), // TODO
      jsi::Value::undefined()); // TODO

  return update(rt, timestamp);
}

jsi::Value CSSTransition::update(jsi::Runtime &rt, const double timestamp) {
  progressProvider_.update(timestamp);
  const auto result =
      styleInterpolator_.interpolate(rt, shadowNode_, progressProvider_);
  // Remove interpolators for which interpolation has finished
  // (we won't need them anymore in the current transition)
  styleInterpolator_.discardFinishedInterpolators(progressProvider_);
  return result;
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

bool CSSTransition::isAllowedProperty(const std::string &propName) const {
  if (!isDiscreteProperty(propName)) {
    return true;
  }

  const auto &propertySettings =
      getTransitionPropertySettings(settings_, propName);

  if (!propertySettings.has_value()) {
    return false;
  }
  return propertySettings.value().allowDiscrete;
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
