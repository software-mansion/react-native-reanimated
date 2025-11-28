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
    const auto interpolatorIt = interpolators_.find(propertyName);
    if (interpolatorIt == interpolators_.end()) {
      continue;
    }

    const auto &interpolator = interpolatorIt->second;
    const double fallbackInterpolateThreshold =
        progressProvider->getFallbackInterpolateThreshold(interpolator->isDiscrete());
    result[propertyName] = interpolator->interpolate(shadowNode, progressProvider, fallbackInterpolateThreshold);
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
    jsi::Runtime &rt,
    const CSSTransitionPropertyUpdates &propertyUpdates) {
  std::unordered_set<std::string> reversedPropertyNames;

  for (const auto &[propertyName, diffPair] : propertyUpdates) {
    if (!diffPair.has_value()) {
      interpolators_.erase(propertyName);
      continue;
    }

    auto it = interpolators_.find(propertyName);
    if (it == interpolators_.end()) {
      const auto newInterpolator = createPropertyInterpolator(
          propertyName, {}, getComponentInterpolators(componentName_), viewStylesRepository_);
      it = interpolators_.emplace(propertyName, newInterpolator).first;
    }

    reversedPropertyNames.insert(it->second->updateKeyframesFromStyleChange(rt, diffPair->first, diffPair->second));
  }

  return reversedPropertyNames;
}

} // namespace reanimated::css
