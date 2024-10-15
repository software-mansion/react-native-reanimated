#include <reanimated/CSS/core/CSSTransition.h>

namespace reanimated {

CSSTransition::CSSTransition(
    const unsigned id,
    const ShadowNode::Shared shadowNode,
    const CSSTransitionConfig &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : id_(id),
      shadowNode_(shadowNode),
      properties_(config.properties),
      styleInterpolator_(TransitionStyleInterpolator(viewStylesRepository)),
      progressProvider_(TransitionProgressProvider(
          config.duration,
          config.delay,
          config.easingFunction)) {}

void CSSTransition::updateSettings(
    jsi::Runtime &rt,
    const PartialCSSTransitionSettings &settings) {
  if (settings.properties.has_value()) {
    // TODO - handle property updates
  }
  // TODO update other settings
}

void CSSTransition::run(
    jsi::Runtime &rt,
    const ChangedProps &changedProps,
    const time_t timestamp) {
  styleInterpolator_.updateProperties(rt, changedProps);
  progressProvider_.runProgressProviders(
      rt, timestamp, changedProps.changedPropertyNames);
}

jsi::Value CSSTransition::update(jsi::Runtime &rt, time_t timestamp) {
  progressProvider_.update(timestamp);

  auto updates = styleInterpolator_.update(
      rt, shadowNode_, progressProvider_.getPropertyProgressProviders());

  return updates;
}

} // namespace reanimated
