#include <reanimated/CSS/CSSTransition.h>

namespace reanimated {

CSSTransition::CSSTransition(
    jsi::Runtime &rt,
    ShadowNode::Shared shadowNode,
    const CSSTransitionConfig &config)
    : CSSAnimation(shadowNode),
      styleInterpolator(TransitionStyleInterpolator(
          rt,
          config.transitionProperty,
          config.transitionDuration,
          getEasingFunction(rt, config.transitionTimingFunction),
          config.transitionDelay)) {}

void CSSTransition::start(time_t timestamp) {
  // TODO
}

void CSSTransition::finish() {
  // TODO
}

jsi::Value CSSTransition::update(jsi::Runtime &rt, time_t timestamp) {
  // TODO
  return jsi::Value::undefined();
}

} // namespace reanimated
