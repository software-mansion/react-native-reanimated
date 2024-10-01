#include <reanimated/CSS/CSSTransition.h>

namespace reanimated {

CSSTransition::CSSTransition(
    jsi::Runtime &rt,
    ShadowNode::Shared shadowNode,
    const CSSTransitionConfig &config)
    : shadowNode(shadowNode),
      styleInterpolator(TransitionStyleInterpolator(
          rt,
          config.properties,
          config.duration,
          config.easingFunction,
          config.delay)) {}

void CSSTransition::updateSettings(
    jsi::Runtime &rt,
    const jsi::Value &settings) {
  // TODO
}

void CSSTransition::start(time_t timestamp) {
  // TODO
}

void CSSTransition::finish(const bool revertChanges) {
  // TODO
}

jsi::Value CSSTransition::update(jsi::Runtime &rt, time_t timestamp) {
  // TODO
  return jsi::Value::undefined();
}

} // namespace reanimated
