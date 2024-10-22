#pragma once

#include <reanimated/CSS/progress/ProgressProvider.h>
#include <reanimated/CSS/util/props.h>

#include <queue>
#include <unordered_set>

namespace reanimated {

enum class TransitionProgressState { PENDING, RUNNING, FINISHED };

class TransitionPropertyProgressProvider : public ProgressProvider {
 public:
  using ProgressProvider::ProgressProvider;

  TransitionProgressState getState() const;

 protected:
  std::optional<double> calculateRawProgress(const time_t timestamp) override;

 private:
  double getElapsedTime(const time_t timestamp) const;
};

class TransitionProgressProvider {
 public:
  TransitionProgressProvider(
      const double duration,
      const double delay,
      const EasingFunction easingFunction);

  // double getMinDelay() const;
  TransitionProgressState getState() const;
  std::optional<TransitionPropertyProgressProvider> getPropertyProgressProvider(
      const std::string &propertyName) const;
  std::unordered_map<std::string, TransitionPropertyProgressProvider>
  getPropertyProgressProviders() const {
    return propertyProgressProviders_;
  }

  void setDuration(const double duration) {
    duration_ = duration;
  }
  void setDelay(const double delay) {
    delay_ = delay;
  }
  void setEasingFunction(const EasingFunction easingFunction) {
    easingFunction_ = easingFunction;
  }

  void runProgressProviders(
      jsi::Runtime &rt,
      const time_t timestamp,
      const PropertyNames &changedPropertyNames);
  void update(const time_t timestamp);

 private:
  double duration_;
  double delay_; // TODO - add delay support
  EasingFunction easingFunction_;

  std::vector<std::string> propertiesToRemove_;
  std::unordered_map<std::string, TransitionPropertyProgressProvider>
      propertyProgressProviders_;
};

} // namespace reanimated
