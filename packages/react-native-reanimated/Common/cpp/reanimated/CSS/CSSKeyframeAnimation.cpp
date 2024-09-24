#include <reanimated/CSS/CSSKeyframeAnimation.h>

namespace reanimated {

CSSKeyframeAnimation::CSSKeyframeAnimation(
    jsi::Runtime &rt,
    ShadowNode::Shared shadowNode,
    const CSSAnimationConfig &config)
    : CSSAnimation(shadowNode),
      styleInterpolator(AnimationStyleInterpolator(rt, config.keyframedStyle)),
      progressProvider(AnimationProgressProvider(
          config.animationDuration,
          config.animationDelay,
          config.animationIterationCount,
          getAnimationDirection(config.animationDirection),
          getEasingFunction(rt, config.animationTimingFunction))),
      fillMode(getAnimationFillMode(config.animationFillMode)) {}

void CSSKeyframeAnimation::start(time_t timestamp) {
  progressProvider.update(timestamp);

  if (progressProvider.getState() == Finished) {
    state = CSSAnimationState::finished;
    return;
  }

  state = CSSAnimationState::running;
  progressProvider.reset(timestamp);
}

void CSSKeyframeAnimation::finish() {
  state = CSSAnimationState::finished;
}

jsi::Value CSSKeyframeAnimation::update(jsi::Runtime &rt, time_t timestamp) {
  progressProvider.update(timestamp);

  // Check if the animation has not started yet because of the delay
  if (progressProvider.getState() == Pending) {
    // We have to return the style from the first animation keyframe (apply
    // backwards fill mode) in every keyframe before the animation starts
    // if the fill mode is backwards or both
    return maybeApplyBackwardsFillMode(rt);
  }

  const bool shouldFinish = progressProvider.getState() == Finished;
  // Determine if the progress update direction has changed (e.g. because of
  // the easing used or the alternating animation direction)
  const bool directionChanged =
      !shouldFinish && progressProvider.hasDirectionChanged();

  auto updatedStyle = styleInterpolator.update(
      createUpdateContext(rt, progressProvider.getCurrent(), directionChanged));

  if (state == CSSAnimationState::finishing) {
    finish();
    return maybeApplyForwardsFillMode(rt);
  } else if (shouldFinish) {
    state = CSSAnimationState::finishing;
  }

  return updatedStyle;
}

CSSAnimationDirection CSSKeyframeAnimation::getAnimationDirection(
    const std::string &str) {
  static const std::unordered_map<std::string, CSSAnimationDirection>
      strToEnumMap = {
          {"normal", normal},
          {"reverse", reverse},
          {"alternate", alternate},
          {"alternate-reverse", alternateReverse}};

  auto it = strToEnumMap.find(str);
  if (it != strToEnumMap.end()) {
    return it->second;
  } else {
    throw std::invalid_argument(
        "[Reanimated] Invalid string for CSSAnimationDirection enum: " + str);
  }
}

CSSAnimationFillMode CSSKeyframeAnimation::getAnimationFillMode(
    const std::string &str) {
  static const std::unordered_map<std::string, CSSAnimationFillMode>
      strToEnumMap = {
          {"none", none},
          {"forwards", forwards},
          {"backwards", backwards},
          {"both", both}};

  auto it = strToEnumMap.find(str);
  if (it != strToEnumMap.end()) {
    return it->second;
  } else {
    throw std::invalid_argument(
        "[Reanimated] Invalid string for CSSAnimationFillMode enum: " + str);
  }
}

InterpolationUpdateContext CSSKeyframeAnimation::createUpdateContext(
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

jsi::Value CSSKeyframeAnimation::maybeApplyBackwardsFillMode(jsi::Runtime &rt) {
  if (fillMode == backwards || fillMode == both) {
    // Return the style from the first animation keyframe
    return styleInterpolator.update(createUpdateContext(rt, 0, false));
  }
  return jsi::Value::undefined();
}

jsi::Value CSSKeyframeAnimation::maybeApplyForwardsFillMode(jsi::Runtime &rt) {
  if (fillMode == forwards || fillMode == both) {
    // Don't restore the style from the view style if the forwards fill mode is
    // applied
    return jsi::Value::undefined();
  }
  // Reset all styles applied during the animation and restore the
  // view style (progress can be any value because it is not used by reset)
  return styleInterpolator.reset(createUpdateContext(rt, 0, false));
}

} // namespace reanimated
