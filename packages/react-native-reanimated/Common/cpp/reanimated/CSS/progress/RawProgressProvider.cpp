#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/progress/RawProgressProvider.h>

namespace reanimated {

RawProgressProvider::RawProgressProvider(
    const double timestamp,
    const double duration,
    const double delay)
    : duration_(duration), delay_(delay), creationTimestamp_(timestamp) {}

void RawProgressProvider::setDuration(double duration) {
  resetProgress();
  duration_ = duration;
}

void RawProgressProvider::setDelay(double delay) {
  resetProgress();
  delay_ = delay;
}

void RawProgressProvider::resetProgress() {
  rawProgress_.reset();
  previousRawProgress_.reset();
}

void RawProgressProvider::update(const double timestamp) {
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

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
