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

  // Every ordered comparison against NaN is false, so a bare `< 0` / `>= 1`
  // pair would let one through and the interpolators would turn it into a NaN
  // style value. Testing for it by name keeps both bounds reading normally.
  const double progress = rawProgress_.value();
  if (std::isnan(progress) || progress < 0) {
    rawProgress_.reset();
  } else if (progress >= 1) {
    rawProgress_ = 1;
  }
}

} // namespace reanimated::css
