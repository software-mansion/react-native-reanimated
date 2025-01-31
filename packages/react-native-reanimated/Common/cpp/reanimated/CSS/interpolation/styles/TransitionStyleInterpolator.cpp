#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>

namespace reanimated {

TransitionStyleInterpolator::TransitionStyleInterpolator(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository) {}

jsi::Value TransitionStyleInterpolator::getCurrentInterpolationStyle(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  jsi::Object result(rt);

  for (const auto &[propertyName, interpolator] : interpolators_) {
    jsi::Value value = interpolator->getCurrentValue(rt, shadowNode);
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

jsi::Value TransitionStyleInterpolator::update(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const std::unordered_set<std::string> &propertiesToRemove) {
  if (interpolators_.empty()) {
    return jsi::Value::undefined();
  }

  jsi::Object result(rt);

  for (auto it = interpolators_.begin(); it != interpolators_.end();) {
    const auto &[propertyName, interpolator] = *it;

    jsi::Value value = interpolator->update(rt, shadowNode);
    result.setProperty(rt, propertyName.c_str(), value);

    if (propertiesToRemove.find(propertyName) != propertiesToRemove.cend()) {
      it = interpolators_.erase(it);
    } else {
      ++it;
    }
  }

  return result;
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
    const TransitionPropertyProgressProviders &progressProviders) {
  const auto oldPropsObj = changedProps.oldProps.asObject(rt);
  const auto newPropsObj = changedProps.newProps.asObject(rt);

  for (const auto &propertyName : changedProps.changedPropertyNames) {
    auto interpolatorIt = interpolators_.find(propertyName);

    const auto oldValue = oldPropsObj.getProperty(rt, propertyName.c_str());
    const auto newValue = newPropsObj.getProperty(rt, propertyName.c_str());

    if (interpolatorIt == interpolators_.end()) {
      const auto newInterpolator = createPropertyInterpolator(
          propertyName,
          {},
          PROPERTY_INTERPOLATORS_CONFIG,
          progressProviders.at(propertyName),
          viewStylesRepository_);
      interpolatorIt =
          interpolators_.emplace(propertyName, newInterpolator).first;
    } else {
      interpolatorIt->second->setProgressProvider(
          progressProviders.at(propertyName));
    }

    interpolatorIt->second->updateKeyframesFromStyleChange(
        rt, oldValue, newValue);
  }
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
