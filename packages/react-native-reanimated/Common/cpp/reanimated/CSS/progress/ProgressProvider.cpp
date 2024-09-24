#include <reanimated/CSS/progress/ProgressProvider.h>

namespace reanimated {

ProgressProvider::ProgressProvider(
    double duration,
    double delay,
    EasingFunction easingFunction)
    : duration(duration), delay(delay), easingFunction(easingFunction) {}

void ProgressProvider::reset(time_t startTime) {
  this->startTime = startTime;
  currentProgress.reset();
  previousProgress.reset();
  previousToPreviousProgress.reset();
  state = Pending;
}

void ProgressProvider::update(time_t timestamp) {
  if (startTime == 0) {
    startTime = timestamp;
  }
  currentTimestamp = timestamp;
  previousToPreviousProgress = previousProgress;
  previousProgress = currentProgress;
  currentProgress = calculateProgress(timestamp);
}

std::optional<double> ProgressProvider::calculateProgress(time_t timestamp) {
  if (duration == 0) {
    state = Finished;
    return 1;
  }
  if (timestamp - startTime < delay) {
    state = Pending;
    return std::nullopt;
  }

  const auto rawProgress = calculateRawProgress(timestamp);

  if (!rawProgress.has_value()) {
    state = Pending;
    return std::nullopt;
  }
  if (rawProgress.value() < 0) {
    state = Pending;
    return std::nullopt;
  }
  if (rawProgress.value() >= 1) {
    state = Finished;
    return decorateProgress(1);
  }

  state = Running;
  return easingFunction(decorateProgress(rawProgress.value()));
}

bool ProgressProvider::hasDirectionChanged() const {
  if (currentProgress.has_value() && previousProgress.has_value() &&
      previousToPreviousProgress.has_value()) {
    const auto prevDiff =
        previousProgress.value() - previousToPreviousProgress.value();
    const auto currentDiff = currentProgress.value() - previousProgress.value();
    return prevDiff * currentDiff < 0;
  }
  return false;
}

} // namespace reanimated
