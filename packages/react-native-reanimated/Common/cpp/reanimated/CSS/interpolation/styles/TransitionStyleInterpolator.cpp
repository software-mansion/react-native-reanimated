#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>

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
    const TransitionProgressProvider &transitionProgressProvider) const {
  folly::dynamic result = folly::dynamic::object;

  for (const auto &[propertyName, progressProvider] : transitionProgressProvider.getPropertyProgressProviders()) {
    const auto &interpolator = interpolators_.at(propertyName);
    const auto fallbackInterpolateThreshold = (allowDiscreteProperties_.contains(propertyName)) ? 0.5 : 0;
    result[propertyName] = interpolator->interpolate(shadowNode, progressProvider, fallbackInterpolateThreshold);
  }

  return result;
}

bool TransitionStyleInterpolator::createOrUpdateInterpolator(
    const std::string &propertyName,
    const folly::dynamic &oldValue,
    const folly::dynamic &newValue,
    const folly::dynamic &lastValue) {
  const auto &interpolator = getOrCreateInterpolator(propertyName);
  // TODO - check if is good
  return interpolator->updateKeyframes(lastValue.isNull() ? oldValue : lastValue, newValue);
}

void TransitionStyleInterpolator::setAllowDiscrete(const std::string &propertyName, const bool allowDiscrete) {
  if (allowDiscrete) {
    allowDiscreteProperties_.insert(propertyName);
  } else {
    allowDiscreteProperties_.erase(propertyName);
  }
}

void TransitionStyleInterpolator::removeProperty(const std::string &propertyName) {
  interpolators_.erase(propertyName);
  allowDiscreteProperties_.erase(propertyName);
}

void TransitionStyleInterpolator::discardFinishedInterpolators(
    const TransitionProgressProvider &transitionProgressProvider) {
  for (const auto &propertyName : transitionProgressProvider.getRemovedProperties()) {
    removeProperty(propertyName);
  }
}

std::shared_ptr<PropertyInterpolator> TransitionStyleInterpolator::getOrCreateInterpolator(
    const std::string &propertyName) {
  if (!interpolators_.contains(propertyName)) {
    interpolators_.emplace(
        propertyName,
        createPropertyInterpolator(propertyName, {}, getComponentInterpolators(componentName_), viewStylesRepository_));
  }

  return interpolators_.at(propertyName);
}

} // namespace reanimated::css
