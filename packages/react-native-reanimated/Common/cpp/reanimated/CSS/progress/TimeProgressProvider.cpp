#include <reanimated/CSS/progress/TimeProgressProvider.h>

#include <cmath>

namespace reanimated::css {

TimeProgressProvider::TimeProgressProvider(const double timestamp, const double duration, const double delay)
    : duration_(duration), delay_(delay), creationTimestamp_(timestamp) {}

void TimeProgressProvider::setDuration(double duration) {
  duration_ = duration;
}

void TimeProgressProvider::setDelay(double delay) {
  delay_ = delay;
}

void TimeProgressProvider::resetProgress() {
  rawProgress_.reset();
}

void TimeProgressProvider::update(const double timestamp) {
  lastTimestamp_ = timestamp;

  if (timestamp - creationTimestamp_ < delay_) {
    rawProgress_.reset();
    return;
  }

  rawProgress_ = calculateRawProgress(timestamp);
  if (!rawProgress_.has_value()) {
    return;
  }

  // Every ordered comparison against NaN is false, so a NaN would clear both
  // bounds and reach the interpolators as a NaN style value.
  const double progress = rawProgress_.value();
  if (std::isnan(progress) || progress < 0) {
    rawProgress_.reset();
  } else if (progress >= 1) {
    rawProgress_ = 1;
  }
}

} // namespace reanimated::css
