#include <reanimated/CSS/CSSAnimation.h>

namespace reanimated {

CSSAnimation::CSSAnimation(
    jsi::Runtime &rt,
    ShadowNode::Shared shadowNode,
    const CSSAnimationConfig &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const time_t timestamp)
    : shadowNode(shadowNode),
      styleInterpolator(AnimationStyleInterpolator(
          rt,
          config.keyframeStyle,
          viewStylesRepository)),
      progressProvider(AnimationProgressProvider(
          config.animationDuration,
          config.animationDelay,
          config.animationIterationCount,
          config.animationDirection,
          config.easingFunction)),
      fillMode(config.animationFillMode) {
  progressProvider.start(timestamp);
}

jsi::Value CSSAnimation::getBackwardsFillStyle(jsi::Runtime &rt) const {
  return hasBackwardsFillMode() ? styleInterpolator.getBackwardsFillValue(rt)
                                : jsi::Value::undefined();
}

jsi::Value CSSAnimation::getForwardsFillStyle(jsi::Runtime &rt) const {
  return hasForwardsFillMode() ? styleInterpolator.getForwardsFillValue(rt)
                               : jsi::Value::undefined();
}

jsi::Value CSSAnimation::getCurrentStyle(jsi::Runtime &rt) const {
  return styleInterpolator.getStyleValue(rt, shadowNode);
}

void CSSAnimation::updateSettings(
    jsi::Runtime &rt,
    const jsi::Value &settings) {
  const auto settingsObject = settings.asObject(rt);
}

void CSSAnimation::run() {
  if (progressProvider.getState() == Finished) {
    state = AnimationState::finished;
    return;
  }
  state = AnimationState::running;
}

jsi::Value CSSAnimation::update(jsi::Runtime &rt, time_t timestamp) {
  progressProvider.update(timestamp);

  // Check if the animation has not started yet because of the delay
  // (In general, it shouldn't be activated until the delay has passed but we
  // add this check to make sure that animation doesn't start with the negative
  // progress)
  if (progressProvider.getState() == Pending) {
    return jsi::Value::undefined();
  }

  const bool shouldFinish = progressProvider.getState() == Finished;
  // Determine if the progress update direction has changed (e.g. because of
  // the easing used or the alternating animation direction)
  const bool directionChanged =
      !shouldFinish && progressProvider.hasDirectionChanged();

  auto updatedStyle = styleInterpolator.update(
      createUpdateContext(rt, progressProvider.getCurrent(), directionChanged));

  if (shouldFinish) {
    state = AnimationState::finished;
  }

  return updatedStyle;
}

InterpolationUpdateContext CSSAnimation::createUpdateContext(
    jsi::Runtime &rt,
    double progress,
    bool directionChanged) const {
  return {
      rt,
      shadowNode,
      progress,
      progressProvider.getPrevious(),
      progressProvider.hasDirectionChanged()};
}

} // namespace reanimated
