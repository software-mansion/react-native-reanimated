#include <reanimated/CSS/progress/TimeProgressProvider.h>

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

  if (rawProgress_.value() < 0) {
    rawProgress_.reset();
  } else if (rawProgress_.value() >= 1) {
    rawProgress_ = 1;
  }
}

} // namespace reanimated::css
