#include <reanimated/CSS/core/CSSTransition.h>

#include <memory>
#include <string>
#include <utility>

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

folly::dynamic CSSTransition::getCurrentInterpolationStyle() const {
  return styleInterpolator_.interpolate(shadowNode_, progressProvider_);
}

TransitionProperties CSSTransition::getProperties() const {
  return transitionProperties_;
}

folly::dynamic
CSSTransition::run(const CSSTransitionConfig &config, const folly::dynamic &lastUpdateValue, const double timestamp) {
  // Update interpolators and progress providers for changed properties
  handleChangedProperties(config, lastUpdateValue, timestamp);
  // Remove interpolators and progress providers for no longer transitioned props
  handleRemovedProperties(config);
  // Return the first transition frame
  return update(timestamp);
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
    const CSSTransitionConfig &config,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  const auto null = folly::dynamic();

  for (const auto &[propertyName, propertySettings] : config.changedProperties) {
    transitionProperties_.insert(propertyName);

    // Update the transition style interpolator
    const auto valueChange = propertySettings.value;
    const auto lastValue = lastUpdateValue.getDefault(propertyName, null);
    const auto isReversed =
        styleInterpolator_.createOrUpdateInterpolator(propertyName, valueChange.first, valueChange.second, lastValue);
    styleInterpolator_.setAllowDiscrete(propertyName, propertySettings.allowDiscrete);

    // Update the transition progress provider
    progressProvider_.runProgressProvider(propertyName, propertySettings, isReversed, timestamp);
  }
}

void CSSTransition::handleRemovedProperties(const CSSTransitionConfig &config) {
  for (const auto &propertyName : config.removedProperties) {
    transitionProperties_.erase(propertyName);
    styleInterpolator_.removeProperty(propertyName);
    progressProvider_.removeProperty(propertyName);
  }
}

} // namespace reanimated::css
