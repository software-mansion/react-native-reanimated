#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>
#include <reanimated/CSS/utils/interpolatorPropsBuilderCallbacks.h>

#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

TransitionStyleInterpolator::TransitionStyleInterpolator(
    const std::string &componentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : componentName_(componentName), viewStylesRepository_(viewStylesRepository) {}

folly::dynamic TransitionStyleInterpolator::interpolate(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const TransitionProgressProvider &transitionProgressProvider,
    const std::shared_ptr<AnimatedPropsBuilder> &propsBuilder,
    const std::unordered_set<std::string> &allowDiscreteProperties) const {
  folly::dynamic result = folly::dynamic::object;

  const auto allFallbackInterpolateThreshold = allowDiscreteProperties.contains("all") ? 0.5 : 0;

  for (const auto &[propertyName, progressProvider] : transitionProgressProvider.getPropertyProgressProviders()) {
    const auto &interpolator = interpolators_.at(propertyName);
    const auto fallbackInterpolateThreshold =
        (allowDiscreteProperties.contains(propertyName)) ? 0.5 : allFallbackInterpolateThreshold;

    result[propertyName] =
        interpolator->interpolate(shadowNode, progressProvider, propsBuilder, fallbackInterpolateThreshold);
  }

  return result;
}

void TransitionStyleInterpolator::discardFinishedInterpolators(
    const TransitionProgressProvider &transitionProgressProvider) {
  for (const auto &propertyName : transitionProgressProvider.getRemovedProperties()) {
    interpolators_.erase(propertyName);
  }
}

void TransitionStyleInterpolator::discardIrrelevantInterpolators(
    const std::unordered_set<std::string> &transitionPropertyNames) {
  for (auto it = interpolators_.begin(); it != interpolators_.end();) {
    // Remove property interpolators for properties not specified in the
    // transition property names
    if (transitionPropertyNames.find(it->first) == transitionPropertyNames.end()) {
      it = interpolators_.erase(it);
    } else {
      ++it;
    }
  }
}

std::unordered_set<std::string> TransitionStyleInterpolator::updateInterpolatedProperties(
    const ChangedProps &changedProps,
    const folly::dynamic &lastUpdateValue) {
  std::unordered_set<std::string> reversedProperties;
  const auto &oldPropsObj = changedProps.oldProps;
  const auto &newPropsObj = changedProps.newProps;

  const auto empty = folly::dynamic();

  for (const auto &propertyName : changedProps.changedPropertyNames) {
    auto it = interpolators_.find(propertyName);
    const auto shouldCreateInterpolator = it == interpolators_.end();

    if (shouldCreateInterpolator) {
      const auto newInterpolator = createPropertyInterpolator(
          propertyName, {}, getComponentInterpolators(componentName_), viewStylesRepository_);
      it = interpolators_.emplace(propertyName, newInterpolator).first;
    }

    const auto &oldValue = oldPropsObj.getDefault(propertyName, empty);
    const auto &newValue = newPropsObj.getDefault(propertyName, empty);
    // Pass lastValue only if the interpolator is updated (no new interpolator
    // was created), otherwise pass an empty value
    const auto &lastValue =
        (shouldCreateInterpolator || lastUpdateValue.empty()) ? empty : lastUpdateValue.getDefault(propertyName, empty);

    const bool isReversed = it->second->updateKeyframesFromStyleChange(oldValue, newValue, lastValue);
    if (isReversed) {
      reversedProperties.insert(propertyName);
    }
  }
  return reversedProperties;
}

} // namespace reanimated::css
