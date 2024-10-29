#include <reanimated/CSS/progress/AnimationProgressProvider.h>

namespace reanimated {

AnimationProgressProvider::AnimationProgressProvider(
    const double duration,
    const double delay,
    const double iterationCount,
    const AnimationDirection direction,
    const EasingFunction &easingFunction)
    : ProgressProvider(duration, delay, easingFunction),
      iterationCount_(iterationCount),
      direction_(direction) {}

AnimationProgressState AnimationProgressProvider::getState(
    const double timestamp) const {
  if (shouldFinish(timestamp)) {
    return AnimationProgressState::FINISHED;
  }
  if (pauseTimestamp_ > 0) {
    return AnimationProgressState::PAUSED;
  }
  if (!rawProgress_.has_value()) {
    return AnimationProgressState::PENDING;
  }
  const auto rawProgress = rawProgress_.value();
  if (rawProgress >= 1) {
    return AnimationProgressState::FINISHED;
  }
  return AnimationProgressState::RUNNING;
}

void AnimationProgressProvider::pause(const double timestamp) {
  pauseTimestamp_ = timestamp;
}

void AnimationProgressProvider::play(const double timestamp) {
  if (pauseTimestamp_ > 0) {
    pausedTimeBefore_ += timestamp - pauseTimestamp_;
  }
  pauseTimestamp_ = 0;
}

void AnimationProgressProvider::resetProgress() {
  ProgressProvider::resetProgress();
  currentIteration_ = 1;
  previousIterationsDuration_ = 0;
}

inline time_t AnimationProgressProvider::getTotalPausedTime(
    const double timestamp) const {
  return pauseTimestamp_ > 0 ? timestamp - pauseTimestamp_ + pausedTimeBefore_
                             : pausedTimeBefore_;
}

bool AnimationProgressProvider::shouldFinish(const double timestamp) const {
  if (iterationCount_ == 0) {
    return true;
  }
  // Check if the animation has finished (duration can be a floating point
  // number so we can't just check if the progress is 1.0)
  return iterationCount_ != -1 &&
      (timestamp - (delay_ + startTime_ + getTotalPausedTime(timestamp))) >=
      duration_ * iterationCount_;
}

std::optional<double> AnimationProgressProvider::calculateRawProgress(
    const double timestamp) {
  const double currentIterationElapsedTime = timestamp -
      (startTime_ + delay_ + previousIterationsDuration_ +
       getTotalPausedTime(timestamp));

  if (currentIterationElapsedTime < 0) {
    return std::nullopt;
  }

  const double iterationProgress =
      updateIterationProgress(currentIterationElapsedTime);

  if (shouldFinish(timestamp)) {
    // Override current progress for the last update in the last iteration to
    // ensure that animation finishes exactly at the specified iteration
    const double intPart = std::floor(iterationCount_);
    return intPart == iterationCount_ ? 1 : iterationCount_ - intPart;
  }

  return iterationProgress;
}

double AnimationProgressProvider::updateIterationProgress(
    const double currentIterationElapsedTime) {
  // We can increase curentIteration by more than just one iteration if the
  // animation delay is negative, thus we are using this division to get the
  // number of iterations that have passed since the previous animation update
  // (deltaIterations can be greater than for the first update of the
  // animation with the negative delay)
  const double progress = currentIterationElapsedTime / duration_;
  const unsigned deltaIterations = static_cast<unsigned>(progress);

  if (deltaIterations > 0) {
    // Return 1 if the current iteration is the last one
    if (currentIteration_ == iterationCount_) {
      return 1;
    }

    currentIteration_ += deltaIterations;
    previousIterationsDuration_ = (currentIteration_ - 1) * duration_;

    if (direction_ == AnimationDirection::NORMAL ||
        direction_ == AnimationDirection::REVERSE) {
      previousProgress_.reset();
      previousToPreviousProgress_.reset();
    }
  }

  // If the current iteration changes, the progress must be updated
  // respectively not to contain the progress of the previous iteration
  return progress - deltaIterations;
}

double AnimationProgressProvider::applyAnimationDirection(
    const double progress) const {
  switch (direction_) {
    case AnimationDirection::NORMAL:
      return progress;
    case AnimationDirection::REVERSE:
      return 1.0 - progress;
    case AnimationDirection::ALTERNATE:
      return currentIteration_ % 2 == 0 ? 1.0 - progress : progress;
    case AnimationDirection::ALTERNATE_REVERSE:
      return currentIteration_ % 2 == 0 ? progress : 1.0 - progress;
  }
}

} // namespace reanimated
