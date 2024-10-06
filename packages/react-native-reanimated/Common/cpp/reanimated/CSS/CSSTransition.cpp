#include <reanimated/CSS/CSSTransition.h>

namespace reanimated {

CSSTransition::CSSTransition(
    jsi::Runtime &rt,
    const unsigned id,
    const ShadowNode::Shared shadowNode,
    const CSSTransitionConfig &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : id_(id),
      shadowNode_(shadowNode),
      styleInterpolator_(TransitionStyleInterpolator(
          rt,
          config.properties,
          viewStylesRepository)) {}

void CSSTransition::updateSettings(
    jsi::Runtime &rt,
    const PartialCSSTransitionSettings &settings,
    const time_t timestamp) {
  // TODO
}

void CSSTransition::run(
    jsi::Runtime &rt,
    const jsi::Value &oldProps,
    const jsi::Value &newProps) {
  // TODO
}

jsi::Value CSSTransition::update(jsi::Runtime &rt, time_t timestamp) {
  // TODO
  return jsi::Value::undefined();
}

} // namespace reanimated
