#pragma once

#include <optional>
namespace reanimated::css {

class RawProgressProvider {
 public:
  RawProgressProvider(double timestamp, double duration, double delay);

  void setDuration(double duration);
  void setDelay(double delay);

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

} // namespace reanimated::css
