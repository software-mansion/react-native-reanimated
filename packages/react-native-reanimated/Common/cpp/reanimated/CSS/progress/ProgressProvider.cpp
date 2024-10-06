#include <reanimated/CSS/progress/ProgressProvider.h>

namespace reanimated {

ProgressProvider::ProgressProvider(
    const double duration,
    const double delay,
    const EasingFunction easingFunction)
    : duration_(duration), delay_(delay), easingFunction_(easingFunction) {}

void ProgressProvider::start(const time_t timestamp) {
  startTime_ = timestamp;
}

void ProgressProvider::resetProgress() {
  rawProgress_.reset();
  currentProgress_.reset();
  previousProgress_.reset();
  previousToPreviousProgress_.reset();
}

void ProgressProvider::update(const time_t timestamp) {
  previousToPreviousProgress_ = previousProgress_;
  previousProgress_ = currentProgress_;
  currentProgress_ = calculateProgress(timestamp);
}

std::optional<double> ProgressProvider::calculateProgress(
    const time_t timestamp) {
  if (duration_ == 0) {
    rawProgress_ = 1;
    return 1;
  }
  if (timestamp - startTime_ < delay_) {
    rawProgress_.reset();
    return std::nullopt;
  }

  rawProgress_ = calculateRawProgress(timestamp);

  if (!rawProgress_.has_value()) {
    return std::nullopt;
  }
  if (rawProgress_.value() < 0) {
    rawProgress_.reset();
    return std::nullopt;
  }
  if (rawProgress_.value() >= 1) {
    rawProgress_ = 1;
    return decorateProgress(1);
  }

  return easingFunction_(decorateProgress(rawProgress_.value()));
}

bool ProgressProvider::hasDirectionChanged() const {
  if (currentProgress_.has_value() && previousProgress_.has_value() &&
      previousToPreviousProgress_.has_value()) {
    const auto prevDiff =
        previousProgress_.value() - previousToPreviousProgress_.value();
    const auto currentDiff =
        currentProgress_.value() - previousProgress_.value();
    return prevDiff * currentDiff < 0;
  }
  return false;
}

} // namespace reanimated
