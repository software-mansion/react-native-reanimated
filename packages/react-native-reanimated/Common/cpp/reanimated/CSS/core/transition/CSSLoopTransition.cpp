#include <reanimated/CSS/core/transition/CSSLoopTransition.h>

#include <jsi/JSIDynamic.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSLoopTransition::CSSLoopTransition(
    const Tag viewTag,
    const std::string &componentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    OnUpdateCallback onUpdate)
    : viewTag_(viewTag),
      componentName_(componentName),
      onUpdate_(std::move(onUpdate)),
      styleInterpolator_(TransitionStyleInterpolator(componentName_, viewStylesRepository)),
      progressProvider_(TransitionProgressProvider()) {}

double CSSLoopTransition::getMinDelay(double timestamp) const {
  return progressProvider_.getMinDelay(timestamp);
}

bool CSSLoopTransition::update(const double timestamp, OperationsLoop &loop) {
  progressProvider_.update(timestamp);
  onUpdate_(viewTag_);

  if (progressProvider_.getState() == TransitionProgressState::Pending) {
    loop.schedule(shared_from_this(), timestamp + progressProvider_.getMinDelay(timestamp));
  }

  return progressProvider_.getState() == TransitionProgressState::Running;
}

folly::dynamic CSSLoopTransition::run(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const PropertyValueDiffsMap &propertiesDiffs,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  // Update interpolators and progress providers for changed properties
  handleChangedProperties(
      rt, propertiesDiffs, lastUpdateValue.empty() ? folly::dynamic::object() : lastUpdateValue, timestamp);
  // Advance progress and return the first transition frame
  progressProvider_.update(timestamp);
  return computeCurrentStyle(shadowNode);
}

folly::dynamic CSSLoopTransition::run(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const PropertyValueDynamicDiffsMap &propertiesDiffs,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  handleChangedProperties(
      propertiesDiffs, lastUpdateValue.empty() ? folly::dynamic::object() : lastUpdateValue, timestamp);
  progressProvider_.update(timestamp);
  return computeCurrentStyle(shadowNode);
}

void CSSLoopTransition::updateSettings(
    const PropertiesSettingsMap &changedPropertiesSettings,
    const std::vector<std::string> &removedProperties) {

  // Remove interpolators and progress providers for no longer transitioned props
  removeProperties(removedProperties);

  // Update the settings saved in progress provider
  progressProvider_.setPropertySettings(changedPropertiesSettings);
}

folly::dynamic CSSLoopTransition::computeCurrentStyle(const std::shared_ptr<const ShadowNode> &shadowNode) {
  auto result = styleInterpolator_.interpolate(shadowNode, progressProvider_);
  // Remove interpolators for which interpolation has finished
  // (we won't need them anymore in the current transition)
  styleInterpolator_.discardFinishedInterpolators(progressProvider_);
  // And remove finished progress providers after they were used to calculate
  // the last frame of the transition
  progressProvider_.discardFinishedProgressProviders();
  return result;
}

void CSSLoopTransition::handleChangedProperties(
    jsi::Runtime &rt,
    const PropertyValueDiffsMap &propertiesDiffs,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  const auto null = folly::dynamic();

  for (const auto &[propertyName, propertyDiff] : propertiesDiffs) {
    const auto allowDiscrete = progressProvider_.getPropertySettings(propertyName).allowDiscrete;

    if (!allowDiscrete && isDiscreteProperty(propertyName, componentName_)) {
      removeProperty(propertyName);
      continue;
    }

    // Update the transition style interpolator
    bool isReversed;
    if (lastUpdateValue.count(propertyName)) {
      // TODO - get rid of lastValue dynamic in the future
      isReversed = styleInterpolator_.createOrUpdateInterpolator(
          rt, propertyName, jsi::valueFromDynamic(rt, lastUpdateValue.at(propertyName)), propertyDiff.second);
    } else {
      isReversed =
          styleInterpolator_.createOrUpdateInterpolator(rt, propertyName, propertyDiff.first, propertyDiff.second);
    }

    // We still pass allowDiscrete to use correct threshold for interpolation between incompatible values
    // (e.g. when someone passes a keyword and a numeric value - in this case we interpolate them as discrete values)
    styleInterpolator_.setAllowDiscrete(propertyName, allowDiscrete);

    // Update the transition progress provider
    progressProvider_.runProgressProvider(propertyName, isReversed, timestamp);
  }
}

void CSSLoopTransition::handleChangedProperties(
    const PropertyValueDynamicDiffsMap &propertiesDiffs,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  for (const auto &[propertyName, propertyDiff] : propertiesDiffs) {
    const auto allowDiscrete = progressProvider_.getPropertySettings(propertyName).allowDiscrete;

    if (!allowDiscrete && isDiscreteProperty(propertyName, componentName_)) {
      removeProperty(propertyName);
      continue;
    }

    bool isReversed;
    if (lastUpdateValue.count(propertyName)) {
      isReversed = styleInterpolator_.createOrUpdateInterpolator(
          propertyName, lastUpdateValue.at(propertyName), propertyDiff.second);
    } else {
      isReversed = styleInterpolator_.createOrUpdateInterpolator(propertyName, propertyDiff.first, propertyDiff.second);
    }

    styleInterpolator_.setAllowDiscrete(propertyName, allowDiscrete);

    progressProvider_.runProgressProvider(propertyName, isReversed, timestamp);
  }
}

void CSSLoopTransition::removeProperties(const std::vector<std::string> &propertyNames) {
  styleInterpolator_.removeProperties(propertyNames);
  progressProvider_.removeProperties(propertyNames);
}

void CSSLoopTransition::removeProperty(const std::string &propertyName) {
  styleInterpolator_.removeProperty(propertyName);
  progressProvider_.removeProperty(propertyName);
}

} // namespace reanimated::css
