#pragma once

#include <reanimated/CSS/progress/ProgressProvider.h>
#include <reanimated/CSS/util/props.h>

#include <queue>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated {

enum class TransitionProgressState { PENDING, RUNNING, FINISHED };

class TransitionPropertyProgressProvider final : public ProgressProvider {
 public:
  using ProgressProvider::ProgressProvider;

  TransitionProgressState getState() const;
  double getRemainingDelay(double timestamp) const;

 protected:
  std::optional<double> calculateRawProgress(double timestamp) override;

 private:
  double getElapsedTime(double timestamp) const;
};

class TransitionProgressProvider {
 public:
  TransitionProgressProvider(
      double duration,
      double delay,
      const EasingFunction &easingFunction);

  TransitionProgressState getState() const;
  double getMinDelay(double timestamp) const;
  std::unordered_map<std::string, TransitionPropertyProgressProvider>
  getPropertyProgressProviders() const {
    return propertyProgressProviders_;
  }

  void setDuration(double duration) {
    duration_ = duration;
  }
  void setDelay(double delay) {
    delay_ = delay;
  }
  void setEasingFunction(const EasingFunction &easingFunction) {
    easingFunction_ = easingFunction;
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

  std::vector<std::string> propertiesToRemove_;
  std::unordered_map<std::string, TransitionPropertyProgressProvider>
      propertyProgressProviders_;
};

} // namespace reanimated
