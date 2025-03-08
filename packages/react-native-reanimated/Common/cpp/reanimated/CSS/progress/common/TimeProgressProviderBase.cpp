#include <reanimated/CSS/progress/common/TimeProgressProviderBase.h>

namespace reanimated::css {

TimeProgressProviderBase::TimeProgressProviderBase(
    const double timestamp,
    const double duration,
    const double delay)
    : duration_(duration), delay_(delay), creationTimestamp_(timestamp) {}

void TimeProgressProviderBase::setDuration(double duration) {
  resetProgress();
  duration_ = duration;
}

void TimeProgressProviderBase::setDelay(double delay) {
  resetProgress();
  delay_ = delay;
}

void TimeProgressProviderBase::resetProgress() {
  rawProgress_.reset();
  previousRawProgress_.reset();
}

void TimeProgressProviderBase::update(const double timestamp) {
  previousRawProgress_ = rawProgress_;

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
