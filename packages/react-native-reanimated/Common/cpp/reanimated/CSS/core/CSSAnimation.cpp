#include <reanimated/CSS/core/CSSAnimation.h>

#include <utility>

namespace reanimated::css {

CSSAnimation::CSSAnimation(
    jsi::Runtime &rt,
    ShadowNode::Shared shadowNode,
    std::string name,
    const CSSKeyframesConfig &keyframesConfig,
    const CSSAnimationSettings &settings,
    const double timestamp)
    : name_(std::move(name)),
      shadowNode_(std::move(shadowNode)),
      fillMode_(settings.fillMode),
      progressProvider_(
          std::make_shared<AnimationProgressProvider>(
              timestamp,
              settings.duration,
              settings.delay,
              settings.iterationCount,
              settings.direction,
              settings.easingFunction,
              keyframesConfig.keyframeEasingFunctions)),
      styleInterpolator_(keyframesConfig.styleInterpolator) {
  if (settings.playState == AnimationPlayState::Paused) {
    progressProvider_->pause(timestamp);
  }
}

const std::string &CSSAnimation::getName() const {
  return name_;
}

ShadowNode::Shared CSSAnimation::getShadowNode() const {
  return shadowNode_;
}

double CSSAnimation::getStartTimestamp(const double timestamp) const {
  return progressProvider_->getStartTimestamp(timestamp);
}

AnimationProgressState CSSAnimation::getState(double timestamp) const {
  return progressProvider_->getState(timestamp);
}

bool CSSAnimation::isReversed() const {
  const auto direction = progressProvider_->getDirection();
  return direction == AnimationDirection::Reverse ||
      direction == AnimationDirection::AlternateReverse;
}

bool CSSAnimation::hasForwardsFillMode() const {
  return fillMode_ == AnimationFillMode::Forwards ||
      fillMode_ == AnimationFillMode::Both;
}

bool CSSAnimation::hasBackwardsFillMode() const {
  return fillMode_ == AnimationFillMode::Backwards ||
      fillMode_ == AnimationFillMode::Both;
}

folly::dynamic CSSAnimation::getResetStyle() const {
  return styleInterpolator_->getResetStyle(shadowNode_);
}

folly::dynamic CSSAnimation::getBackwardsFillStyle() const {
  return isReversed() ? styleInterpolator_->getLastKeyframeValue()
                      : styleInterpolator_->getFirstKeyframeValue();
}

folly::dynamic CSSAnimation::getForwardsFillStyle() const {
  return isReversed() ? styleInterpolator_->getFirstKeyframeValue()
                      : styleInterpolator_->getLastKeyframeValue();
}

void CSSAnimation::run(const double timestamp) {
  if (progressProvider_->getState(timestamp) ==
      AnimationProgressState::Finished) {
    return;
  }
  progressProvider_->play(timestamp);
}

folly::dynamic CSSAnimation::update(const double timestamp) {
  progressProvider_->update(timestamp);
  const auto currentState = progressProvider_->getState(timestamp);

  if (currentState == AnimationProgressState::Pending) {
    return hasBackwardsFillMode() ? getBackwardsFillStyle() : folly::dynamic();
  }
  if (currentState == AnimationProgressState::Finished) {
    return hasForwardsFillMode() ? getForwardsFillStyle() : folly::dynamic();
  }

  return styleInterpolator_->interpolate(shadowNode_, progressProvider_);
}

void CSSAnimation::updateSettings(
    const PartialCSSAnimationSettings &updatedSettings,
    const double timestamp) {
  if (updatedSettings.duration.has_value()) {
    progressProvider_->setDuration(updatedSettings.duration.value());
  }
  if (updatedSettings.easingFunction.has_value()) {
    progressProvider_->setEasingFunction(
        updatedSettings.easingFunction.value());
  }
  if (updatedSettings.delay.has_value()) {
    progressProvider_->setDelay(updatedSettings.delay.value());
  }
  if (updatedSettings.iterationCount.has_value()) {
    progressProvider_->setIterationCount(
        updatedSettings.iterationCount.value());
  }
  if (updatedSettings.direction.has_value()) {
    progressProvider_->setDirection(updatedSettings.direction.value());
  }
  if (updatedSettings.fillMode.has_value()) {
    fillMode_ = updatedSettings.fillMode.value();
  }
  if (updatedSettings.playState.has_value()) {
    if (updatedSettings.playState.value() == AnimationPlayState::Paused) {
      progressProvider_->pause(timestamp);
    } else {
      progressProvider_->play(timestamp);
    }
  }
}

} // namespace reanimated::css
