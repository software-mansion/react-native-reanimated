#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/easing/EasingFunctions.h>

#include <variant>

using namespace facebook;

namespace reanimated {

class TransitionProperties {
 public:
  TransitionProperties(jsi::Runtime &rt, const jsi::Value &transitionProperty);

  std::optional<PropertyNames> get() const;

 private:
  std::variant<PropertyNames, bool> properties_;

  std::variant<PropertyNames, bool> parseProperties(
      jsi::Runtime &rt,
      const jsi::Value &transitionProperty);
};

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

inline TransitionProperties getTransitionProperty(
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

PartialCSSTransitionSettings parsePartialCSSTransitionSettings(
    jsi::Runtime &rt,
    const jsi::Value &config);

} // namespace reanimated
