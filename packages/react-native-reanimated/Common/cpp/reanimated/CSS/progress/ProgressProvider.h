#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

#include <chrono>
#include <optional>

namespace reanimated {

class ProgressProvider {
 public:
  ProgressProvider(
      const double duration,
      const double delay,
      const EasingFunction easingFunction);

  double getCurrent() const {
    return currentProgress_.value_or(0);
  }
  std::optional<double> getPrevious() const {
    return previousProgress_;
  }
  time_t getStartTime() const {
    return startTime_;
  }
  double getDelay() const {
    return delay_;
  }

  void setDuration(const double duration) {
    resetProgress();
    duration_ = duration;
  }
  void setEasingFunction(const EasingFunction easingFunction) {
    resetProgress();
    easingFunction_ = easingFunction;
  }
  void setDelay(const double delay) {
    resetProgress();
    delay_ = delay;
  }

  bool hasDirectionChanged() const;

  void start(const time_t timestamp);
  virtual void resetProgress();
  void update(const time_t timestamp);

 protected:
  double duration_;
  double delay_;
  EasingFunction easingFunction_;

  time_t startTime_ = 0;

  std::optional<double> rawProgress_;
  // These progress values are resulting progress returned by the `get` method
  // with all adjustments, such as easing, applied
  std::optional<double> currentProgress_;
  std::optional<double> previousProgress_;
  std::optional<double> previousToPreviousProgress_;

  /**
   * Calculates the progress of the animation at the given timestamp without
   * applying any decorations (e.g. animation direction, easing)
   */
  virtual std::optional<double> calculateRawProgress(time_t timestamp) = 0;

  /**
   * Decorates the calculated progress with additional information when
   * necessary (e.g. animation direction). Easing will be applied automatically.
   */
  virtual double decorateProgress(double progress) const {
    return progress;
  }

 private:
  std::optional<double> calculateProgress(time_t timestamp);
};

} // namespace reanimated
