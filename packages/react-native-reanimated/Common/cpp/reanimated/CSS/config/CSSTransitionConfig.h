#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/config/common.h>
#include <reanimated/CSS/easing/EasingFunctions.h>

namespace reanimated {

struct CSSTransitionConfig {
  TransitionProperties properties;
  double duration;
  EasingFunction easingFunction;
  double delay;
};

struct PartialCSSTransitionSettings {
  std::optional<TransitionProperties> properties;
  std::optional<double> duration;
  std::optional<EasingFunction> easingFunction;
  std::optional<double> delay;
};

TransitionProperties getProperties(jsi::Runtime &rt, const jsi::Object &config);

CSSTransitionConfig parseCSSTransitionConfig(
    jsi::Runtime &rt,
    const jsi::Value &config);

PartialCSSTransitionSettings parsePartialCSSTransitionSettings(
    jsi::Runtime &rt,
    const jsi::Value &config);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
