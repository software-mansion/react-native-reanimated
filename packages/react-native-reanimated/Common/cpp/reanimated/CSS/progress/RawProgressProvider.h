#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <chrono>
#include <optional>
#include <utility>

namespace reanimated {

class RawProgressProvider {
 public:
  RawProgressProvider(double timestamp, double duration, double delay);

  void setDuration(double duration) {
    resetProgress();
    duration_ = duration;
  }
  void setDelay(double delay) {
    resetProgress();
    delay_ = delay;
  }

  virtual void resetProgress();
  void update(double timestamp);

 protected:
  double duration_;
  double delay_;
  double creationTimestamp_;

  std::optional<double> rawProgress_;
  std::optional<double> previousRawProgress_;

  /**
   * Calculates the progress of the animation at the given timestamp without
   * applying any decorations (e.g. animation direction, easing)
   */
  virtual std::optional<double> calculateRawProgress(double timestamp) = 0;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
