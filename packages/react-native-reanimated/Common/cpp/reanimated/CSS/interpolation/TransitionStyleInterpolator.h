#pragma once

#include <reanimated/CSS/interpolation/StyleInterpolatorsConfig.h>
#include <reanimated/CSS/progress/TransitionPropertyProgressProvider.h>

namespace reanimated {

struct PropertyInterpolatorState {
  std::shared_ptr<Interpolator> interpolator;
  std::shared_ptr<TransitionPropertyProgressProvider> progressProvider;
};

using TransitionPropertyStates =
    std::unordered_map<std::string, std::shared_ptr<PropertyInterpolatorState>>;

// We cannot re-use the logic from the ObjectPropertiesInterpolator class as
// transition properties can be animated independently with different
// progress values
class TransitionStyleInterpolator {
 public:
  TransitionStyleInterpolator(
      jsi::Runtime &rt,
      // TODO - move this to a setter function later on when we add re-renders
      // support
      const jsi::Array &properties,
      double duration,
      const EasingFunction &easingFunction,
      double delay);

  void updateViewStyle(jsi::Runtime &rt, const jsi::Value &value);

  jsi::Value update(time_t timestamp);

 private:
  const TransitionPropertyStates states_;

  TransitionPropertyStates build(
      jsi::Runtime &rt,
      const jsi::Array &properties,
      double duration,
      const EasingFunction &easingFunction,
      double delay,
      const ObjectPropertiesInterpolatorFactories &factories);
};

} // namespace reanimated
