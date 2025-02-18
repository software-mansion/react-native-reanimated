#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>

namespace reanimated {

TransitionStyleInterpolator::TransitionStyleInterpolator(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository) {}

std::unordered_set<std::string>
TransitionStyleInterpolator::getReversedPropertyNames(
    const folly::dynamic &newPropertyValues) const {
  std::unordered_set<std::string> reversedProperties;

  if (!newPropertyValues.isObject()) {
    return reversedProperties;
  }

  for (const auto &pair : newPropertyValues.items()) {
    const auto propertyName = pair.first.getString();
    const auto &propertyValue = pair.second;

    const auto it = interpolators_.find(propertyName);
    if (it != interpolators_.end() &&
        // First keyframe value of the previous transition is the reversing
        // adjusted start value
        it->second->equalsFirstKeyframeValue(propertyValue)) {
      reversedProperties.insert(propertyName);
    }
  }

  return reversedProperties;
}

folly::dynamic TransitionStyleInterpolator::interpolate(
    const ShadowNode::Shared &shadowNode,
    const TransitionProgressProvider &transitionProgressProvider) const {
  return mapInterpolators(
      transitionProgressProvider,
      [&](const std::shared_ptr<PropertyInterpolator> &interpolator,
          const std::shared_ptr<KeyframeProgressProvider> &progressProvider) {
        return interpolator->interpolate(shadowNode, progressProvider);
      });
}

void TransitionStyleInterpolator::discardFinishedInterpolators(
    const TransitionProgressProvider &transitionProgressProvider) {
  for (const auto &propertyName :
       transitionProgressProvider.getRemovedProperties()) {
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
    const ChangedProps &changedProps,
    const folly::dynamic &lastUpdateValue) {
  const auto &oldPropsObj = changedProps.oldProps;
  const auto &newPropsObj = changedProps.newProps;

  for (const auto &propertyName : changedProps.changedPropertyNames) {
    auto it = interpolators_.find(propertyName);
    const auto shouldCreateInterpolator = it == interpolators_.end();

    if (shouldCreateInterpolator) {
      const auto newInterpolator = createPropertyInterpolator(
          propertyName,
          {},
          PROPERTY_INTERPOLATORS_CONFIG,
          viewStylesRepository_);
      it = interpolators_.emplace(propertyName, newInterpolator).first;
    }

    const auto &newValue = newPropsObj[propertyName];

    // Try to use a value from the last CSS transition update (only if the
    // interpolator existed - when the transition was interrupted)
    if (!shouldCreateInterpolator && lastUpdateValue.isObject()) {
      const auto oldValue = lastUpdateValue.count(propertyName) > 0
          ? lastUpdateValue[propertyName]
          : oldPropsObj[propertyName];
      it->second->updateKeyframesFromStyleChange(oldValue, newValue);
    } else {
      it->second->updateKeyframesFromStyleChange(
          oldPropsObj[propertyName], newValue);
    }
  }
}

folly::dynamic TransitionStyleInterpolator::mapInterpolators(
    const TransitionProgressProvider &transitionProgressProvider,
    const MapInterpolatorsCallback &callback) const {
  folly::dynamic result = folly::dynamic::object;

  for (const auto &[propertyName, progressProvider] :
       transitionProgressProvider.getPropertyProgressProviders()) {
    result[propertyName] =
        callback(interpolators_.at(propertyName), progressProvider);
  }

  return result;
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
