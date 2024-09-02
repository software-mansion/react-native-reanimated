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
      styleInterpolator(KeyframedStyleInterpolator(rt, config.keyframedStyle)) {
}

void CSSAnimation::start(time_t timestamp) {
  state = CSSAnimationState::running;
  startTime = timestamp;
}

jsi::Value CSSAnimation::update(jsi::Runtime &rt, time_t timestamp) {
  double progress = (timestamp - startTime) / duration;

  if (progress >= 1.0) {
    progress = 1.0;
    finish();
  }

  auto updatedStyle = styleInterpolator.update({
      .rt = rt,
      .progress = easingFunction(progress),
      .node = shadowNode,
  });

  return updatedStyle;
}

void CSSAnimation::finish() {
  state = CSSAnimationState::finished;
  // TODO: restore original styles if animation-fill-mode is not set
}

} // namespace reanimated
