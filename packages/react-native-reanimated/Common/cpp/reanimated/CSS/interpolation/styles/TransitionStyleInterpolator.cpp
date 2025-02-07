#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>

namespace reanimated {

TransitionStyleInterpolator::TransitionStyleInterpolator(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository) {}

jsi::Value TransitionStyleInterpolator::getCurrentInterpolationStyle(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const TransitionProgressProvider &progressProvider) const {
  jsi::Object result(rt);

  for (const auto &[propertyName, progressProvider] : progressProviders_) {
    const auto interpolator = interpolators_.at(propertyName);
    const auto value =
        interpolator->interpolate(rt, shadowNode, progressProvider);
    result.setProperty(rt, propertyName.c_str(), value);
  }

  return result;
}

std::unordered_set<std::string>
TransitionStyleInterpolator::getReversedPropertyNames(
    jsi::Runtime &rt,
    const jsi::Value &newPropertyValues) const {
  std::unordered_set<std::string> reversedProperties;

  const auto propertyValuesObject = newPropertyValues.asObject(rt);
  const auto propertyNames = propertyValuesObject.getPropertyNames(rt);
  const auto propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const auto propertyName =
        propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto propertyValue = propertyValuesObject.getProperty(
        rt, jsi::PropNameID::forUtf8(rt, propertyName));

    const auto it = interpolators_.find(propertyName);
    if (it != interpolators_.end() &&
        it->second->equalsReversingAdjustedStartValue(rt, propertyValue)) {
      reversedProperties.insert(propertyName);
    }
  }

  return reversedProperties;
}

jsi::Value TransitionStyleInterpolator::interpolate(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const TransitionProgressProvider &transitionProgressProvider) const {
  if (interpolators_.empty()) {
    return jsi::Value::undefined();
  }

  jsi::Object result(rt);

  for (const auto &[propertyName, progressProvider] :
       transitionProgressProvider.getPropertyProgressProviders()) {
    const auto interpolator = interpolators_.at(propertyName);
    const auto value =
        interpolator->interpolate(rt, shadowNode, progressProvider);
    result.setProperty(rt, propertyName.c_str(), value);
  }

  return result;
}

void TransitionStyleInterpolator::discardFinishedInterpolators(
    const TransitionProgressProvider &progressProvider) {
  for (const auto propertyName : progressProvider.getRemovedProperties()) {
    interpolators_.erase(propertyName);
  }
}

void TransitionStyleInterpolator::discardIrrelevantInterpolators(
    const std::unordered_set<std::string> &transitionPropertyNames) {
  for (auto it = interpolators_.begin(); it != interpolators_.end();) {
    // Remove property interpolators for properties not specified in the
    // transition property names
    if (transitionPropertyNames.find(it->first) ==
        transitionPropertyNames.end()) {
      it = interpolators_.erase(it);
    } else {
      ++it;
    }
  }
}

void TransitionStyleInterpolator::updateInterpolatedProperties(
    jsi::Runtime &rt,
    const ChangedProps &changedProps,
    const jsi::Value &previousValue, // TODO
    const jsi::Value &reversingAdjustedStartValue /* TODO */) {
  const auto oldPropsObj = changedProps.oldProps.asObject(rt);
  const auto newPropsObj = changedProps.newProps.asObject(rt);

  for (const auto &propertyName : changedProps.changedPropertyNames) {
    auto it = interpolators_.find(propertyName);

    const auto oldValue = oldPropsObj.getProperty(rt, propertyName.c_str());
    const auto newValue = newPropsObj.getProperty(rt, propertyName.c_str());

    if (it == interpolators_.end()) {
      const auto newInterpolator = createPropertyInterpolator(
          propertyName,
          {},
          PROPERTY_INTERPOLATORS_CONFIG,
          viewStylesRepository_);
      it = interpolators_.emplace(propertyName, newInterpolator).first;
    }

    it->second->updateKeyframesFromStyleChange(
        rt, oldValue, newValue, previousValue, reversingAdjustedStartValue);
  }
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
