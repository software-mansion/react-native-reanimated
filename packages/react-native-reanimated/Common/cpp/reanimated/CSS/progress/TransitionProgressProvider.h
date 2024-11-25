#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/progress/KeyframeProgressProvider.h>
#include <reanimated/CSS/progress/RawProgressProvider.h>
#include <reanimated/CSS/util/props.h>

#include <queue>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated {

enum class TransitionProgressState { PENDING, RUNNING, FINISHED };

class TransitionPropertyProgressProvider final
    : public KeyframeProgressProvider,
      public RawProgressProvider {
 public:
  TransitionPropertyProgressProvider(
      double timestamp,
      double duration,
      double delay,
      const EasingFunction &easingFunction);

  double getGlobalProgress() const override {
    return rawProgress_.value_or(0);
  }
  bool isFirstUpdate() const override {
    return !previousRawProgress_.has_value();
  }
  double getKeyframeProgress(double fromOffset, double toOffset) const override;
  TransitionProgressState getState() const;
  double getRemainingDelay(double timestamp) const;

 protected:
  std::optional<double> calculateRawProgress(double timestamp) override;

 private:
  EasingFunction easingFunction_;

  double getElapsedTime(double timestamp) const;
};

using TransitionPropertyProgressProviders = std::unordered_map<
    std::string,
    std::shared_ptr<TransitionPropertyProgressProvider>>;

class TransitionProgressProvider {
 public:
  TransitionProgressProvider(
      double duration,
      double delay,
      const EasingFunction &easingFunction);

  void setDuration(double duration) {
    duration_ = duration;
  }
  void setDelay(double delay) {
    delay_ = delay;
  }
  void setEasingFunction(const EasingFunction &easingFunction) {
    easingFunction_ = easingFunction;
  }

  TransitionProgressState getState() const;
  double getMinDelay(double timestamp) const;
  TransitionPropertyProgressProviders getPropertyProgressProviders() const {
    return propertyProgressProviders_;
  }
  std::unordered_set<std::string> getPropertiesToRemove() const {
    return propertiesToRemove_;
  }

  void discardIrrelevantProgressProviders(
      const std::unordered_set<std::string> &transitionPropertyNames);
  void runProgressProviders(
      jsi::Runtime &rt,
      double timestamp,
      const PropertyNames &changedPropertyNames);
  void update(double timestamp);

 private:
  double duration_;
  double delay_;
  EasingFunction easingFunction_;

  std::unordered_set<std::string> propertiesToRemove_;

  TransitionPropertyProgressProviders propertyProgressProviders_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
