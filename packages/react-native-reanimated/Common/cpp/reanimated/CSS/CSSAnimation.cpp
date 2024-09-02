#include <reanimated/CSS/CSSAnimation.h>

namespace reanimated {

CSSAnimation::CSSAnimation(
    jsi::Runtime &rt,
    ShadowNode::Shared shadowNode,
    const CSSAnimationConfig &config)
    : state(CSSAnimationState::pending),
      shadowNode(shadowNode),
      duration(config.animationDuration),
      easingFunction(getEasingFunction(config.animationTimingFunction)),
      styleInterpolator(KeyframedStyleInterpolator(rt, config.keyframedStyle)),
      previousProgress(std::nullopt),
      previousToPreviousProgress(std::nullopt) {}

void CSSAnimation::start(time_t timestamp) {
  state = CSSAnimationState::running;
  startTime = timestamp;
  previousProgress.reset();
  previousToPreviousProgress.reset();
}

jsi::Value CSSAnimation::update(jsi::Runtime &rt, time_t timestamp) {
  double progress = (timestamp - startTime) / duration;

  if (timestamp - startTime >= duration) {
    progress = 1.0;
    finish();
  }

  // Determine if the direction has changed
  bool directionChanged = false;
  if (previousProgress.has_value() && previousToPreviousProgress.has_value()) {
    auto prevDiff =
        previousProgress.value() - previousToPreviousProgress.value();
    auto currentDiff = progress - previousProgress.value();
    directionChanged = prevDiff * currentDiff < 0;
  }

  auto updatedStyle = styleInterpolator.update({
      .rt = rt,
      .progress = easingFunction(progress),
      .previousProgress = previousProgress,
      .directionChanged = directionChanged,
      .node = shadowNode,
  });

  previousToPreviousProgress = previousProgress;
  previousProgress = progress;

  return updatedStyle;
}

void CSSAnimation::finish() {
  state = CSSAnimationState::finished;
  // TODO: restore original styles if animation-fill-mode is not set
}

} // namespace reanimated
