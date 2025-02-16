#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>

namespace reanimated {

TransitionStyleInterpolator::TransitionStyleInterpolator(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository) {}

folly::dynamic TransitionStyleInterpolator::getCurrentInterpolationStyle(
    const ShadowNode::Shared &shadowNode) const {
  folly::dynamic result = folly::dynamic::object;

  for (const auto &[propertyName, interpolator] : interpolators_) {
    folly::dynamic value = interpolator->getCurrentValue(shadowNode);
    result[propertyName] = value;
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

folly::dynamic TransitionStyleInterpolator::update(
    const ShadowNode::Shared &shadowNode,
    const std::unordered_set<std::string> &propertiesToRemove) {
  if (interpolators_.empty()) {
    return folly::dynamic();
  }

  folly::dynamic result = folly::dynamic::object;

  for (auto it = interpolators_.begin(); it != interpolators_.end();) {
    const auto &[propertyName, interpolator] = *it;

    result[propertyName] = interpolator->update(shadowNode);

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
      // We have to set the new progress provider when the new transition
      // starts and the interpolator already exists, because the new property
      // progress provider was created on the new transition start.
      interpolatorIt->second->setProgressProvider(
          progressProviders.at(propertyName));
    }

    interpolatorIt->second->updateKeyframesFromStyleChange(
        rt, oldValue, newValue);
  }
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
