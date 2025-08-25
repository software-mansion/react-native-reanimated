#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>

namespace reanimated::css {

TransitionStyleInterpolator::TransitionStyleInterpolator(
    const std::string &componentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : componentName_(componentName),
      viewStylesRepository_(viewStylesRepository) {}

std::unordered_set<std::string>
TransitionStyleInterpolator::getReversedPropertyNames(
    const folly::dynamic &newPropertyValues) const {
  std::unordered_set<std::string> reversedProperties;

  if (!newPropertyValues.isObject()) {
    return reversedProperties;
  }

  for (const auto &[propertyName, propertyValue] : newPropertyValues.items()) {
    const auto propertyNameStr = propertyName.getString();
    const auto it = interpolators_.find(propertyNameStr);
    if (it != interpolators_.end() &&
        // First keyframe value of the previous transition is the reversing
        // adjusted start value
        it->second->equalsReversingAdjustedStartValue(propertyValue)) {
      reversedProperties.insert(propertyNameStr);
    }
  }

  return reversedProperties;
}

folly::dynamic TransitionStyleInterpolator::interpolate(
    const std::shared_ptr<const ShadowNode> &shadowNode,
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

  const auto empty = folly::dynamic();

  for (const auto &propertyName : changedProps.changedPropertyNames) {
    auto it = interpolators_.find(propertyName);
    const auto shouldCreateInterpolator = it == interpolators_.end();

    if (shouldCreateInterpolator) {
      const auto newInterpolator = createPropertyInterpolator(
          propertyName,
          {},
          getComponentInterpolators(componentName_),
          viewStylesRepository_);
      it = interpolators_.emplace(propertyName, newInterpolator).first;
    }

    const auto &oldValue = oldPropsObj.getDefault(propertyName, empty);
    const auto &newValue = newPropsObj.getDefault(propertyName, empty);
    // Pass lastValue only if the interpolator is updated (no new interpolator
    // was created), otherwise pass an empty value
    const auto &lastValue =
        (shouldCreateInterpolator || lastUpdateValue.empty())
        ? empty
        : lastUpdateValue.getDefault(propertyName, empty);

    it->second->updateKeyframesFromStyleChange(oldValue, newValue, lastValue);
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

} // namespace reanimated::css
