#include <reanimated/CSS/core/transition/CSSLoopTransition.h>

#include <jsi/JSIDynamic.h>

#include <memory>
#include <string>
#include <utility>

namespace reanimated::css {

CSSLoopTransition::CSSLoopTransition(
    const Tag viewTag,
    const std::string &componentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    CSSTransition::Observer &observer)
    : viewTag_(viewTag),
      componentName_(componentName),
      observer_(observer),
      styleInterpolator_(TransitionStyleInterpolator(componentName_, viewStylesRepository)),
      progressProvider_(TransitionProgressProvider()) {}

double CSSLoopTransition::getMinDelay(double timestamp) const {
  return progressProvider_.getMinDelay(timestamp);
}

TransitionProgressState CSSLoopTransition::getState() const {
  return progressProvider_.getState();
}

bool CSSLoopTransition::update(const double timestamp, OperationsLoop &loop) {
  progressProvider_.update(timestamp);
  observer_.onTransitionUpdate(viewTag_);

  if (progressProvider_.getState() == TransitionProgressState::Pending) {
    loop.schedule(shared_from_this(), timestamp + progressProvider_.getMinDelay(timestamp));
  }

  return progressProvider_.getState() == TransitionProgressState::Running;
}

folly::dynamic CSSLoopTransition::run(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const CSSTransitionConfig &config,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  // Drop interpolators / progress providers for no-longer-transitioned props.
  for (const auto &propertyName : config.removedProperties) {
    removeProperty(propertyName);
  }

  // Bind through a local lvalue so the const& binds without forcing a copy of
  // lastUpdateValue when it is non-empty.
  const folly::dynamic emptyObject = folly::dynamic::object();
  const folly::dynamic &lastUpdates = lastUpdateValue.empty() ? emptyObject : lastUpdateValue;

  // Update interpolators and progress providers for changed properties.
  for (const auto &[propertyName, propertySettings] : config.changedProperties) {
    runProperty(rt, propertyName, propertySettings, lastUpdates, timestamp);
  }

  progressProvider_.update(timestamp);
  return computeCurrentStyle(shadowNode);
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

void CSSLoopTransition::runProperty(
    jsi::Runtime &rt,
    const std::string &propertyName,
    const CSSTransitionPropertySettings &propertySettings,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  if (!propertySettings.allowDiscrete && isDiscreteProperty(propertyName, componentName_)) {
    removeProperty(propertyName);
    return;
  }

  properties_.insert(propertyName);

  const auto &valueChange = propertySettings.value;

  bool isReversed;
  if (lastUpdateValue.count(propertyName)) {
    // TODO - get rid of lastValue dynamic in the future
    isReversed = styleInterpolator_.createOrUpdateInterpolator(
        rt, propertyName, jsi::valueFromDynamic(rt, lastUpdateValue.at(propertyName)), valueChange.second);
  } else {
    isReversed = styleInterpolator_.createOrUpdateInterpolator(rt, propertyName, valueChange.first, valueChange.second);
  }

  // Pass allowDiscrete so the interpolator picks the right threshold for
  // incompatible value pairs (e.g. keyword interpolated against numeric).
  styleInterpolator_.setAllowDiscrete(propertyName, propertySettings.allowDiscrete);

  progressProvider_.runProgressProvider(propertyName, propertySettings.timing(), isReversed, timestamp);
}

folly::dynamic CSSLoopTransition::run(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const PropertyValueDynamicDiffsMap &propertiesDiffs,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  const folly::dynamic emptyObject = folly::dynamic::object();
  const folly::dynamic &lastUpdates = lastUpdateValue.empty() ? emptyObject : lastUpdateValue;

  for (const auto &[propertyName, propertyDiff] : propertiesDiffs) {
    runPropertyDynamic(propertyName, propertyDiff, lastUpdates, timestamp);
  }

  progressProvider_.update(timestamp);
  return computeCurrentStyle(shadowNode);
}

void CSSLoopTransition::runPropertyDynamic(
    const std::string &propertyName,
    const PropertyValueDynamicDiff &propertyDiff,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  const auto timing = progressProvider_.getPropertySettings(propertyName);

  if (!timing.allowDiscrete && isDiscreteProperty(propertyName, componentName_)) {
    removeProperty(propertyName);
    return;
  }

  properties_.insert(propertyName);

  bool isReversed;
  if (lastUpdateValue.count(propertyName)) {
    isReversed = styleInterpolator_.createOrUpdateInterpolator(
        propertyName, lastUpdateValue.at(propertyName), propertyDiff.second);
  } else {
    isReversed = styleInterpolator_.createOrUpdateInterpolator(propertyName, propertyDiff.first, propertyDiff.second);
  }

  styleInterpolator_.setAllowDiscrete(propertyName, timing.allowDiscrete);

  progressProvider_.runProgressProvider(propertyName, timing, isReversed, timestamp);
}

void CSSLoopTransition::updateSettings(
    const PropertiesTimingSettingsMap &changedPropertiesSettings,
    const std::vector<std::string> &removedProperties) {
  for (const auto &propertyName : removedProperties) {
    removeProperty(propertyName);
  }
  progressProvider_.setPropertySettings(changedPropertiesSettings);
}

void CSSLoopTransition::removeProperty(const std::string &propertyName) {
  properties_.erase(propertyName);
  styleInterpolator_.removeProperty(propertyName);
  progressProvider_.removeProperty(propertyName);
}

} // namespace reanimated::css
