#include <reanimated/CSS/core/CSSAnimation.h>

namespace reanimated {

CSSAnimation::CSSAnimation(
    jsi::Runtime &rt,
    const unsigned id,
    const ShadowNode::Shared shadowNode,
    const CSSAnimationConfig &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const time_t startTime)
    : id_(id),
      shadowNode_(shadowNode),
      styleInterpolator_(AnimationStyleInterpolator(viewStylesRepository)),
      progressProvider_(AnimationProgressProvider(
          config.duration,
          config.delay,
          config.iterationCount,
          config.direction,
          config.easingFunction)),
      fillMode_(config.fillMode) {
  styleInterpolator_.updateKeyframes(rt, shadowNode, config.keyframeStyle);
  // Register the current timestamp in the progress provider as the start
  // timestamp
  progressProvider_.start(startTime);
  // If the animation is paused, pause it immediately
  if (config.playState == AnimationPlayState::PAUSED) {
    progressProvider_.pause(startTime);
  }
}

jsi::Value CSSAnimation::getBackwardsFillStyle(jsi::Runtime &rt) {
  return hasBackwardsFillMode()
      ? styleInterpolator_.update(createUpdateContext(rt, 0, false))
      : jsi::Value::undefined();
}

void CSSAnimation::run(const time_t timestamp) {
  if (progressProvider_.getState(timestamp) ==
      AnimationProgressState::FINISHED) {
    return;
  }
  progressProvider_.play(timestamp);
}

jsi::Value CSSAnimation::update(jsi::Runtime &rt, const time_t timestamp) {
  progressProvider_.update(timestamp);

  // Check if the animation has not started yet because of the delay
  // (In general, it shouldn't be activated until the delay has passed but we
  // add this check to make sure that animation doesn't start with the negative
  // progress)
  if (progressProvider_.getState(timestamp) ==
      AnimationProgressState::PENDING) {
    return getBackwardsFillStyle(rt);
  }

  const bool isFinished =
      progressProvider_.getState(timestamp) == AnimationProgressState::FINISHED;
  // Determine if the progress update direction has changed (e.g. because of
  // the easing used or the alternating animation direction)
  const bool directionChanged =
      !isFinished && progressProvider_.hasDirectionChanged();

  auto updatedStyle = styleInterpolator_.update(createUpdateContext(
      rt, progressProvider_.getCurrent(), directionChanged));

  return updatedStyle;
}

void CSSAnimation::updateSettings(
    jsi::Runtime &rt,
    const PartialCSSAnimationSettings &updatedSettings,
    const time_t timestamp) {
  if (updatedSettings.duration.has_value()) {
    progressProvider_.setDuration(updatedSettings.duration.value());
  }
  if (updatedSettings.easingFunction.has_value()) {
    progressProvider_.setEasingFunction(updatedSettings.easingFunction.value());
  }
  if (updatedSettings.delay.has_value()) {
    progressProvider_.setDelay(updatedSettings.delay.value());
  }
  if (updatedSettings.iterationCount.has_value()) {
    progressProvider_.setIterationCount(updatedSettings.iterationCount.value());
  }
  if (updatedSettings.direction.has_value()) {
    progressProvider_.setDirection(updatedSettings.direction.value());
  }
  if (updatedSettings.fillMode.has_value()) {
    fillMode_ = updatedSettings.fillMode.value();
  }
  if (updatedSettings.playState.has_value()) {
    if (updatedSettings.playState.value() == AnimationPlayState::PAUSED) {
      progressProvider_.pause(timestamp);
    } else {
      progressProvider_.play(timestamp);
    }
  }
}

InterpolationUpdateContext CSSAnimation::createUpdateContext(
    jsi::Runtime &rt,
    const double progress,
    const bool directionChanged) const {
  return {
      rt,
      shadowNode_,
      progress,
      progressProvider_.getPrevious(),
      progressProvider_.hasDirectionChanged()};
}

} // namespace reanimated
