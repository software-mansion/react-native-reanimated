#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/core/CSSAnimation.h>

namespace reanimated {

CSSAnimation::CSSAnimation(
    jsi::Runtime &rt,
    const unsigned id,
    ShadowNode::Shared shadowNode,
    const CSSAnimationConfig &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const double timestamp)
    : id_(id),
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

  if (config.playState == AnimationPlayState::PAUSED) {
    // If the animation is created as paused, pause its progress provider
    // immediately
    progressProvider_->pause(timestamp);
  }
}

jsi::Value CSSAnimation::getBackwardsFillStyle(jsi::Runtime &rt) {
  if (!hasBackwardsFillMode()) {
    return jsi::Value::undefined();
  }

  const auto direction = progressProvider_->getDirection();
  if (direction == AnimationDirection::REVERSE ||
      direction == AnimationDirection::ALTERNATE_REVERSE) {
    return styleInterpolator_.getLastKeyframeValue(rt);
  }
  return styleInterpolator_.getFirstKeyframeValue(rt);
}

void CSSAnimation::run(const double timestamp) {
  if (progressProvider_->getState(timestamp) ==
      AnimationProgressState::FINISHED) {
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
      AnimationProgressState::PENDING) {
    return getBackwardsFillStyle(rt);
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
    if (updatedSettings.playState.value() == AnimationPlayState::PAUSED) {
      progressProvider_->pause(timestamp);
    } else {
      progressProvider_->play(timestamp);
    }
  }
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
