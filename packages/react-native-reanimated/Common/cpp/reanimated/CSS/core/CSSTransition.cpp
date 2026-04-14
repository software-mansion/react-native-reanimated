#include <reanimated/CSS/core/CSSTransition.h>

#include <jsi/JSIDynamic.h>

#include <memory>
#include <string>
#include <utility>

namespace reanimated::css {

CSSTransition::CSSTransition(
    std::shared_ptr<const ShadowNode> shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::shared_ptr<std::unordered_set<Tag>> &updatedViewTags,
    const std::shared_ptr<OperationsLoop> &loop)
    : shadowNode_(std::move(shadowNode)),
      viewStylesRepository_(viewStylesRepository),
      updatedViewTags_(updatedViewTags),
      loop_(loop),
      styleInterpolator_(TransitionStyleInterpolator(shadowNode_->getComponentName(), viewStylesRepository)),
      progressProvider_(TransitionProgressProvider()) {}

void CSSTransition::onUpdate(const double timestamp) {
  progressProvider_.update(timestamp);
  updatedViewTags_->insert(shadowNode_->getTag());

  if (getState() == TransitionProgressState::Pending) {
    loop_->schedule(shared_from_this(), timestamp + getMinDelay(timestamp));
  }
}

bool CSSTransition::isRunning() const {
  return getState() == TransitionProgressState::Running;
}

Tag CSSTransition::getViewTag() const {
  return shadowNode_->getTag();
}

ShadowNodeFamily::Shared CSSTransition::getShadowNodeFamily() const {
  return shadowNode_->getFamilyShared();
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
    const CSSTransitionConfig &config,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  // Update interpolators and progress providers for changed properties
  handleChangedProperties(rt, config, lastUpdateValue.empty() ? folly::dynamic::object() : lastUpdateValue, timestamp);
  // Remove interpolators and progress providers for no longer transitioned props
  handleRemovedProperties(config);
  // Advance progress and return the first transition frame
  progressProvider_.update(timestamp);
  return computeCurrentStyle();
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
    const CSSTransitionConfig &config,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  const auto null = folly::dynamic();

  for (const auto &[propertyName, propertySettings] : config.changedProperties) {
    const auto allowDiscrete = propertySettings.allowDiscrete;

    if (!allowDiscrete && isDiscreteProperty(propertyName, shadowNode_->getComponentName())) {
      removeProperty(propertyName);
      continue;
    }

    transitionProperties_.insert(propertyName);

    // Update the transition style interpolator
    const auto &valueChange = propertySettings.value;

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
    progressProvider_.runProgressProvider(propertyName, propertySettings, isReversed, timestamp);
  }
}

void CSSTransition::handleRemovedProperties(const CSSTransitionConfig &config) {
  for (const auto &propertyName : config.removedProperties) {
    removeProperty(propertyName);
  }
}

void CSSTransition::removeProperty(const std::string &propertyName) {
  transitionProperties_.erase(propertyName);
  styleInterpolator_.removeProperty(propertyName);
  progressProvider_.removeProperty(propertyName);
}

} // namespace reanimated::css
