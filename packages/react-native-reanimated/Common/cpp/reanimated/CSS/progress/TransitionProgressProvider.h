#pragma once

#include <reanimated/CSS/progress/ProgressProvider.h>

#include <queue>
#include <unordered_set>

namespace reanimated {

enum class TransitionProgressState { PENDING, RUNNING };

class TransitionPropertyProgressProvider : public ProgressProvider {
 public:
  using ProgressProvider::ProgressProvider;

  TransitionProgressState getState(const time_t timestamp) const {
    return TransitionProgressState::PENDING; // TODO
  }

  void run(const time_t timestamp);

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
  std::unordered_set<std::string> getRunningProperties() const {
    return runningProperties_;
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

  void addProperties(const std::vector<std::string> &propertyNames);
  void removeProperties(const std::vector<std::string> &propertyNames);
  void runProgressProviders(
      const std::vector<std::string> &propertyNames,
      const time_t timestamp);
  void update(const time_t timestamp);

 private:
  using DelayedQueue = std::priority_queue<
      std::pair<time_t, std::string>,
      std::vector<std::pair<time_t, std::string>>,
      std::greater<std::pair<time_t, std::string>>>;

  double duration_;
  double delay_;
  EasingFunction easingFunction_;

  DelayedQueue delayedPropertiesQueue_;
  std::unordered_set<std::string> runningProperties_;
  std::unordered_set<std::string> delayedProperties_;
  std::unordered_map<std::string, TransitionPropertyProgressProvider>
      propertyProgressProviders_;

  void activateDelayedProperties(const time_t timestamp);
};

} // namespace reanimated
