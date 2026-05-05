#include <reanimated/CSS/core/CSSTransition.h>

#include <jsi/JSIDynamic.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSTransition::CSSTransition(
    std::shared_ptr<const ShadowNode> shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : shadowNode_(std::move(shadowNode)),
      viewStylesRepository_(viewStylesRepository),
      styleInterpolator_(TransitionStyleInterpolator(shadowNode_->getComponentName(), viewStylesRepository)),
      progressProvider_(TransitionProgressProvider()) {}

Tag CSSTransition::getViewTag() const {
  return shadowNode_->getTag();
}

std::shared_ptr<const ShadowNode> CSSTransition::getShadowNode() const {
  return shadowNode_;
}

double CSSTransition::getMinDelay(double timestamp) const {
  return progressProvider_.getMinDelay(timestamp);
}

TransitionProgressState CSSTransition::getState() const {
  return progressProvider_.getState();
}

TransitionProperties CSSTransition::getProperties() const {
  return transitionProperties_;
}

folly::dynamic CSSTransition::run(
    jsi::Runtime &rt,
    const CSSTransitionPropertiesDiffs &propertiesDiffs,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  // Update interpolators and progress providers for changed properties
  handleChangedProperties(
      rt, propertiesDiffs, lastUpdateValue.empty() ? folly::dynamic::object() : lastUpdateValue, timestamp);
  // Return the first transition frame
  return update(timestamp);
}

void CSSTransition::updateSettings(
    const CSSTransitionPropertiesSettings &changedPropertiesSettings,
    const std::vector<std::string> &removedProperties) {

  // Remove interpolators and progress providers for no longer transitioned props
  handleRemovedProperties(removedProperties);

  // Update the settings saved in progress provider
  handleChangedSettings(changedPropertiesSettings);
}

folly::dynamic CSSTransition::update(const double timestamp) {
  progressProvider_.update(timestamp);
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
    const CSSTransitionPropertiesDiffs &propertiesDiffs,
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
    const auto &valueChange = propertyDiff;

    bool isReversed;
    if (lastUpdateValue.count(propertyName)) {
      // TODO - get rid of lastValue dynamic in the future
      isReversed = styleInterpolator_.createOrUpdateInterpolator(
          rt, propertyName, jsi::valueFromDynamic(rt, lastUpdateValue.at(propertyName)), valueChange.second);
    } else {
      isReversed =
          styleInterpolator_.createOrUpdateInterpolator(rt, propertyName, valueChange.first, valueChange.second);
    }

    // We still pass allowDiscrete to use correct threshold for interpolation between incompatible values
    // (e.g. when someone passes a keyword and a numeric value - in this case we interpolate them as discrete values)
    styleInterpolator_.setAllowDiscrete(propertyName, allowDiscrete);

    // Update the transition progress provider
    progressProvider_.runProgressProvider(propertyName, isReversed, timestamp);
  }
}

void CSSTransition::handleChangedSettings(const CSSTransitionPropertiesSettings &changedPropertiesSettings) {
  for (const auto &[propertyName, propertySettings] : changedPropertiesSettings) {
    progressProvider_.setPropertySettings(propertyName, propertySettings);
  }
}

void CSSTransition::handleRemovedProperties(const std::vector<std::string> &removedProperties) {
  for (const auto &propertyName : removedProperties) {
    removeProperty(propertyName);
  }
}

void CSSTransition::removeProperty(const std::string &propertyName) {
  transitionProperties_.erase(propertyName);
  styleInterpolator_.removeProperty(propertyName);
  progressProvider_.removeProperty(propertyName);
}

} // namespace reanimated::css
