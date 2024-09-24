#include <reanimated/CSS/interpolation/TransitionStyleInterpolator.h>

namespace reanimated {

TransitionStyleInterpolator::TransitionStyleInterpolator(
    jsi::Runtime &rt,
    const jsi::Array &properties,
    double duration,
    const EasingFunction &easingFunction,
    double delay)
    : states_(build(
          rt,
          properties,
          duration,
          easingFunction,
          delay,
          styleInterpolatorFactories)) {}

void TransitionStyleInterpolator::updateViewStyle(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  // TODO
}

jsi::Value TransitionStyleInterpolator::update(time_t timestamp) {
  // TODO
  return jsi::Value::undefined();
}

TransitionPropertyStates TransitionStyleInterpolator::build(
    jsi::Runtime &rt,
    const jsi::Array &properties,
    double duration,
    const EasingFunction &easingFunction,
    double delay,
    const ObjectPropertiesInterpolatorFactories &factories) {
  // TODO
  return {};
}

} // namespace reanimated
