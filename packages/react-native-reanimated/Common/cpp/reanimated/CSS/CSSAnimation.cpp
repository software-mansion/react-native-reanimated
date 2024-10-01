#include <reanimated/CSS/CSSAnimation.h>

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
      styleInterpolator_(AnimationStyleInterpolator(
          rt,
          config.keyframeStyle,
          viewStylesRepository)),
      progressProvider_(AnimationProgressProvider(
          config.duration,
          config.delay,
          config.iterationCount,
          config.direction,
          config.easingFunction)),
      fillMode_(config.fillMode) {
  // Register the current timestamp in the progress provider as the start
  // timestamp
  progressProvider_.start(startTime);
  // If the animation is paused, pause it immediately
  if (config.playState == AnimationPlayState::PAUSED) {
    pause(startTime);
  }
}

jsi::Value CSSAnimation::getBackwardsFillStyle(jsi::Runtime &rt) const {
  return hasBackwardsFillMode() ? styleInterpolator_.getBackwardsFillValue(rt)
                                : jsi::Value::undefined();
}

jsi::Value CSSAnimation::getForwardsFillStyle(jsi::Runtime &rt) const {
  return hasForwardsFillMode() ? styleInterpolator_.getForwardsFillValue(rt)
                               : jsi::Value::undefined();
}

jsi::Value CSSAnimation::getCurrentStyle(jsi::Runtime &rt) const {
  return styleInterpolator_.getStyleValue(rt, shadowNode_);
}

void CSSAnimation::updateSettings(
    jsi::Runtime &rt,
    const jsi::Value &settings) {
  const auto settingsObject = settings.asObject(rt);
}

void CSSAnimation::run(time_t timestamp) {
  if (progressProvider_.getState() == ProgressState::FINISHED) {
    return;
  }
  progressProvider_.play(timestamp);
}

void CSSAnimation::pause(time_t timestamp) {
  progressProvider_.pause(timestamp);
}

jsi::Value CSSAnimation::update(jsi::Runtime &rt, time_t timestamp) {
  progressProvider_.update(timestamp);

  // Check if the animation has not started yet because of the delay
  // (In general, it shouldn't be activated until the delay has passed but we
  // add this check to make sure that animation doesn't start with the negative
  // progress)
  if (progressProvider_.getState() == ProgressState::PENDING) {
    return jsi::Value::undefined();
  }

  const bool isFinished =
      progressProvider_.getState() == ProgressState::FINISHED;
  // Determine if the progress update direction has changed (e.g. because of
  // the easing used or the alternating animation direction)
  const bool directionChanged =
      !isFinished && progressProvider_.hasDirectionChanged();

  auto updatedStyle = styleInterpolator_.update(createUpdateContext(
      rt, progressProvider_.getCurrent(), directionChanged));

  return updatedStyle;
}

InterpolationUpdateContext CSSAnimation::createUpdateContext(
    jsi::Runtime &rt,
    double progress,
    bool directionChanged) const {
  return {
      rt,
      shadowNode_,
      progress,
      progressProvider_.getPrevious(),
      progressProvider_.hasDirectionChanged()};
}

} // namespace reanimated
