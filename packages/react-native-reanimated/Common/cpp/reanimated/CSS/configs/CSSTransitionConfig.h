#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

namespace reanimated {

struct CSSTransitionConfig {
  jsi::Array properties;
  double duration;
  EasingFunction easingFunction;
  double delay;
};

inline jsi::Array getTransitionProperty(
    jsi::Runtime &rt,
    const jsi::Object &config);

inline double getTransitionDuration(
    jsi::Runtime &rt,
    const jsi::Object &config);

inline EasingFunction getTransitionTimingFunction(
    jsi::Runtime &rt,
    const jsi::Object &config);

inline double getTransitionDelay(jsi::Runtime &rt, const jsi::Object &config);

CSSTransitionConfig parseCSSTransitionConfig(
    jsi::Runtime &rt,
    const jsi::Value &config);

} // namespace reanimated
