#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/core/CSSAnimation.h>

#include <utility>

namespace reanimated {

CSSAnimation::CSSAnimation(
    jsi::Runtime &rt,
    ShadowNode::Shared shadowNode,
    const unsigned index,
    const CSSAnimationConfig &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const double timestamp)
    : index_(index),
      shadowNode_(std::move(shadowNode)),
      fillMode_(config.fillMode),
      progressProvider_(std::make_shared<AnimationProgressProvider>(
          timestamp,
          config.duration,
          config.delay,
          config.iterationCount,
          config.direction,
          config.easingFunction,
          config.keyframeEasingFunctions)),
      styleInterpolator_(
          AnimationStyleInterpolator(progressProvider_, viewStylesRepository)) {
  styleInterpolator_.updateKeyframes(rt, config.keyframesStyle);

  if (config.playState == AnimationPlayState::Paused) {
    progressProvider_->pause(timestamp);
  }
}

CSSAnimationId CSSAnimation::getId() const {
  return {shadowNode_->getTag(), index_};
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

jsi::Value CSSAnimation::getViewStyle(jsi::Runtime &rt) const {
  return styleInterpolator_.getStyleValue(rt, shadowNode_);
}

jsi::Value CSSAnimation::getCurrentInterpolationStyle(jsi::Runtime &rt) const {
  return styleInterpolator_.getCurrentInterpolationStyle(rt, shadowNode_);
}

jsi::Value CSSAnimation::getBackwardsFillStyle(jsi::Runtime &rt) {
  return isReversed() ? styleInterpolator_.getLastKeyframeValue(rt)
                      : styleInterpolator_.getFirstKeyframeValue(rt);
}

folly::dynamic CSSAnimation::getBackwardsFillStyle() {
  return isReversed() ? styleInterpolator_.getLastKeyframeValue()
                      : styleInterpolator_.getFirstKeyframeValue();
}

jsi::Value CSSAnimation::getForwardFillStyle(jsi::Runtime &rt) {
  return isReversed() ? styleInterpolator_.getFirstKeyframeValue(rt)
                      : styleInterpolator_.getLastKeyframeValue(rt);
}

jsi::Value CSSAnimation::resetStyle(jsi::Runtime &rt) {
  return styleInterpolator_.reset(rt, shadowNode_);
}

void CSSAnimation::run(const double timestamp) {
  if (progressProvider_->getState(timestamp) ==
      AnimationProgressState::Finished) {
    return;
  }
  progressProvider_->play(timestamp);
}

jsi::Value CSSAnimation::update(jsi::Runtime &rt, const double timestamp) {
  progressProvider_->update(timestamp);

  // Check if the animation has not started yet because of the delay
  // (In general, it shouldn't be activated until the delay has passed but we
  // add this check to make sure that animation doesn't start with the negative
  // progress)
  if (progressProvider_->getState(timestamp) ==
      AnimationProgressState::Pending) {
    return hasBackwardsFillMode() ? getBackwardsFillStyle(rt)
                                  : jsi::Value::undefined();
  }

  return styleInterpolator_.update(rt, shadowNode_);
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

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
