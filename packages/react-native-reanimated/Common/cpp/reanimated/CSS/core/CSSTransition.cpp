#include <reanimated/CSS/core/CSSTransition.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <jsi/JSIDynamic.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSTransition::CSSTransition(
    std::shared_ptr<const ShadowNode> shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    Observer &observer)
    : shadowNode_(std::move(shadowNode)),
      viewStylesRepository_(viewStylesRepository),
      observer_(observer),
      styleInterpolator_(TransitionStyleInterpolator(shadowNode_->getComponentName(), viewStylesRepository)),
      progressProvider_(TransitionProgressProvider()) {}

double CSSTransition::getMinDelay(double timestamp) const {
  return progressProvider_.getMinDelay(timestamp);
}

TransitionProgressState CSSTransition::getState() const {
  return progressProvider_.getState();
}

bool CSSTransition::update(const double timestamp, OperationsLoop &loop) {
  progressProvider_.update(timestamp);
  observer_.onTransitionUpdate(shadowNode_->getTag());

  if (progressProvider_.getState() == TransitionProgressState::Pending) {
    loop.schedule(shared_from_this(), timestamp + progressProvider_.getMinDelay(timestamp));
  }

  return progressProvider_.getState() == TransitionProgressState::Running;
}

folly::dynamic CSSTransition::run(
    jsi::Runtime &rt,
    const PropertyValueDiffsMap &propertiesDiffs,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  // Update interpolators and progress providers for changed properties
  handleChangedProperties(
      rt, propertiesDiffs, lastUpdateValue.empty() ? folly::dynamic::object() : lastUpdateValue, timestamp);
  // Advance progress and return the first transition frame
  progressProvider_.update(timestamp);
  return computeCurrentStyle();
}

folly::dynamic CSSTransition::run(
    const PropertyValueDynamicDiffsMap &propertiesDiffs,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  handleChangedProperties(
      propertiesDiffs, lastUpdateValue.empty() ? folly::dynamic::object() : lastUpdateValue, timestamp);
  progressProvider_.update(timestamp);
  return computeCurrentStyle();
}

void CSSTransition::updateConfig(
    const PropertiesSettingsMap &changedPropertiesSettings,
    const std::vector<std::string> &removedProperties) {

  // Remove interpolators and progress providers for no longer transitioned props
  removeProperties(removedProperties);

  // Update the settings saved in progress provider
  progressProvider_.setPropertySettings(changedPropertiesSettings);
}

folly::dynamic CSSTransition::computeCurrentStyle() {
  auto result = styleInterpolator_.interpolate(shadowNode_, progressProvider_);
  // Remove interpolators for which interpolation has finished
  // (we won't need them anymore in the current transition)
  styleInterpolator_.discardFinishedInterpolators(progressProvider_);
  // And remove finished progress providers after they were used to calculate
  // the last frame of the transition
  progressProvider_.discardFinishedProgressProviders();
  return result;
}

void CSSTransition::handleChangedProperties(
    jsi::Runtime &rt,
    const PropertyValueDiffsMap &propertiesDiffs,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  const auto null = folly::dynamic();

  for (const auto &[propertyName, propertyDiff] : propertiesDiffs) {
    const auto allowDiscrete = progressProvider_.getPropertySettings(propertyName).allowDiscrete;

    if (!allowDiscrete && isDiscreteProperty(propertyName, shadowNode_->getComponentName())) {
      removeProperty(propertyName);
      continue;
    }

    transitionProperties_.insert(propertyName);

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

void CSSTransition::handleChangedProperties(
    const PropertyValueDynamicDiffsMap &propertiesDiffs,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  for (const auto &[propertyName, propertyDiff] : propertiesDiffs) {
    const auto allowDiscrete = progressProvider_.getPropertySettings(propertyName).allowDiscrete;

    if (!allowDiscrete && isDiscreteProperty(propertyName, shadowNode_->getComponentName())) {
      removeProperty(propertyName);
      continue;
    }

    transitionProperties_.insert(propertyName);

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

void CSSTransition::removeProperties(const std::vector<std::string> &propertyNames) {
  styleInterpolator_.removeProperties(propertyNames);
  progressProvider_.removeProperties(propertyNames);
  for (const auto &propertyName : propertyNames) {
    transitionProperties_.erase(propertyName);
  }
}

void CSSTransition::removeProperty(const std::string &propertyName) {
  styleInterpolator_.removeProperty(propertyName);
  progressProvider_.removeProperty(propertyName);
  transitionProperties_.erase(propertyName);
}

} // namespace reanimated::css
