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
    const std::shared_ptr<std::unordered_set<Tag>> &updatedViewTags,
    const std::shared_ptr<OperationsLoop> &loop)
    : viewTag_(viewTag),
      updatedViewTags_(updatedViewTags),
      loop_(loop),
      styleInterpolator_(TransitionStyleInterpolator(componentName, viewStylesRepository)),
      progressProvider_(TransitionProgressProvider()) {}

TransitionProperties CSSLoopTransition::getProperties() const {
  return properties_;
}

bool CSSLoopTransition::update(const double timestamp) {
  progressProvider_.update(timestamp);
  updatedViewTags_->insert(viewTag_);

  if (progressProvider_.getState() == TransitionProgressState::Pending) {
    schedule(timestamp + progressProvider_.getMinDelay(timestamp));
  }

  return progressProvider_.getState() == TransitionProgressState::Running;
}

folly::dynamic CSSLoopTransition::run(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const CSSTransitionConfig &config,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  // Bind through a local lvalue so the const& binds without forcing a copy of
  // lastUpdateValue when it is non-empty.
  const folly::dynamic emptyObject = folly::dynamic::object();
  const folly::dynamic &lastUpdates = lastUpdateValue.empty() ? emptyObject : lastUpdateValue;

  // Update interpolators and progress providers for changed properties.
  for (const auto &[propertyName, propertySettings] : config.changedProperties) {
    runProperty(rt, propertyName, propertySettings, lastUpdates, timestamp);
  }
  // Drop interpolators and progress providers for no longer transitioned props.
  for (const auto &propertyName : config.removedProperties) {
    removeProperty(propertyName);
  }

  progressProvider_.update(timestamp);
  auto initialFrame = computeCurrentStyle(shadowNode);

  schedule(timestamp + progressProvider_.getMinDelay(timestamp));

  return initialFrame;
}

void CSSLoopTransition::unschedule() {
  loop_->remove(shared_from_this());
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

void CSSLoopTransition::schedule(const double startTimestamp) {
  loop_->schedule(shared_from_this(), startTimestamp);
}

void CSSLoopTransition::runProperty(
    jsi::Runtime &rt,
    const std::string &propertyName,
    const CSSTransitionPropertySettings &propertySettings,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
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

  progressProvider_.runProgressProvider(propertyName, propertySettings, isReversed, timestamp);
}

void CSSLoopTransition::removeProperty(const std::string &propertyName) {
  properties_.erase(propertyName);
  styleInterpolator_.removeProperty(propertyName);
  progressProvider_.removeProperty(propertyName);
}

} // namespace reanimated::css
