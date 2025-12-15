#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>

#include <memory>
#include <optional>
#include <string>
#include <unordered_set>

namespace reanimated::css {

TransitionStyleInterpolator::TransitionStyleInterpolator(
    const std::string &componentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository), interpolatorFactories_(getComponentInterpolators(componentName)) {}

folly::dynamic TransitionStyleInterpolator::interpolate(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const TransitionProgressProvider &transitionProgressProvider) const {
  folly::dynamic result = folly::dynamic::object;

  for (const auto &[propertyName, progressProvider] : transitionProgressProvider.getPropertyProgressProviders()) {
    const auto interpolatorIt = interpolators_.find(propertyName);
    if (interpolatorIt == interpolators_.end()) {
      continue;
    }

    result[propertyName] = interpolatorIt->second->interpolate(
        shadowNode, progressProvider, progressProvider->getFallbackInterpolateThreshold());
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

std::vector<TransitionPropertyUpdate> TransitionStyleInterpolator::updateInterpolatedProperties(
    jsi::Runtime &rt,
    const CSSTransitionPropertyUpdates &propertyUpdates,
    const jsi::Value &lastUpdates,
    const CSSTransitionPropertiesSettings &settings) {
  std::vector<TransitionPropertyUpdate> result;

  // Check if lastUpdates is null or undefined (converted from empty folly::dynamic())
  const bool hasLastUpdates = !lastUpdates.isNull() && !lastUpdates.isUndefined();
  const jsi::Object lastUpdatesObject = hasLastUpdates ? lastUpdates.asObject(rt) : jsi::Object(rt);

  for (const auto &[propertyName, diffPair] : propertyUpdates) {
    if (!diffPair.has_value() || !isAllowedProperty(propertyName, settings)) {
      // If the diffPair is not present (this means that the property was removed and should no
      // longer be transitioned) or if the property is not allowed to be transitioned, we should
      // remove the interpolator for this property.
      interpolators_.erase(propertyName);
      result.emplace_back(TransitionPropertyUpdate{propertyName, TransitionPropertyStatus::Removed});
      continue;
    }

    auto it = interpolators_.find(propertyName);
    if (it == interpolators_.end()) {
      const auto newInterpolator =
          createPropertyInterpolator(propertyName, {}, interpolatorFactories_, viewStylesRepository_);
      it = interpolators_.emplace(propertyName, newInterpolator).first;
    }

    // Try to get the last update value from the lastUpdates object
    // If lastUpdates is null/undefined (from empty folly::dynamic()), use diffPair->first
    std::optional<jsi::Value> lastUpdateValueOpt;
    if (hasLastUpdates) {
      auto lastUpdateValue = lastUpdatesObject.getProperty(rt, propertyName.c_str());
      if (!lastUpdateValue.isUndefined()) {
        lastUpdateValueOpt.emplace(std::move(lastUpdateValue));
      }
    }

    const jsi::Value &oldStyleValue = lastUpdateValueOpt.has_value() ? *lastUpdateValueOpt : diffPair->first;
    auto isPropertyReversed = it->second->updateKeyframesFromStyleChange(rt, oldStyleValue, diffPair->second);
    const auto status = isPropertyReversed ? TransitionPropertyStatus::Reversed : TransitionPropertyStatus::Updated;
    result.emplace_back(TransitionPropertyUpdate{propertyName, status});
  }

  return result;
}

bool TransitionStyleInterpolator::isAllowedProperty(
    const std::string &propertyName,
    const CSSTransitionPropertiesSettings &settings) const {
  const auto it = interpolatorFactories_.find(propertyName);
  if (it == interpolatorFactories_.end()) {
    return false;
  }

  // Non-discrete properties are always allowed
  if (!it->second->isDiscrete()) {
    return true;
  }

  // Discrete properties require allowDiscrete to be true
  const auto propertySettings = getTransitionPropertySettings(settings, propertyName);
  return propertySettings.has_value() && propertySettings->allowDiscrete;
}

} // namespace reanimated::css
