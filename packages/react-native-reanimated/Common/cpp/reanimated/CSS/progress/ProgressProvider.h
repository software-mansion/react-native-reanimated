#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/easing/EasingFunctions.h>

#include <chrono>
#include <optional>
#include <utility>

namespace reanimated {

class ProgressProvider {
 public:
  ProgressProvider(
      double timestamp,
      double duration,
      double delay,
      EasingFunction easingFunction);

  double getCurrent() const {
    return currentProgress_.value_or(0);
  }
  std::optional<double> getPrevious() const {
    return previousProgress_;
  }

  void setDuration(double duration) {
    resetProgress();
    duration_ = duration;
  }
  void setEasingFunction(const EasingFunction &easingFunction) {
    resetProgress();
    easingFunction_ = easingFunction;
  }
  void setDelay(double delay) {
    resetProgress();
    delay_ = delay;
  }

  bool hasDirectionChanged() const;

  virtual void resetProgress();
  void update(double timestamp);

 protected:
  double duration_;
  double delay_;
  EasingFunction easingFunction_;
  double creationTimestamp_;

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
  virtual std::optional<double> calculateRawProgress(double timestamp) = 0;
  virtual double decorateProgress(double progress) const = 0;

 private:
  std::optional<double> calculateProgress(double timestamp);
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
