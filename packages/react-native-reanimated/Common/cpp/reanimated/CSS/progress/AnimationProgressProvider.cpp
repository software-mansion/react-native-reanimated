#include <reanimated/CSS/progress/AnimationProgressProvider.h>

namespace reanimated {

AnimationProgressProvider::AnimationProgressProvider(
    double duration,
    double delay,
    double iterationCount,
    AnimationDirection direction,
    EasingFunction easingFunction)
    : ProgressProvider(duration, delay, easingFunction),
      iterationCount(iterationCount),
      direction(direction) {}

void AnimationProgressProvider::reset(time_t startTime) {
  ProgressProvider::reset(startTime);
  currentIteration = 1;
  previousIterationsDuration = 0;
}

bool AnimationProgressProvider::shouldFinish() const {
  if (iterationCount == 0) {
    return true;
  }
  // Check if the animation has finished (duration can be a floating point
  // number so we can't just check if the progress is 1.0)
  return iterationCount != -1 &&
      (currentTimestamp - (delay + startTime)) >= duration * iterationCount;
}

std::optional<double> AnimationProgressProvider::calculateRawProgress(
    time_t timestamp) {
  const double currentIterationElapsedTime =
      timestamp - (startTime + delay + previousIterationsDuration);

  if (currentIterationElapsedTime < 0) {
    return std::nullopt;
  }

  const double iterationProgress =
      updateIterationProgress(timestamp, currentIterationElapsedTime);

  if (shouldFinish()) {
    // Override current progress for the last update in the last iteration to
    // ensure that animation finishes exactly at the specified iteration
    const double intPart = std::floor(iterationCount);
    return intPart == iterationCount ? 1 : iterationCount - intPart;
  }

  return iterationProgress;
}

double AnimationProgressProvider::updateIterationProgress(
    time_t timestamp,
    double currentIterationElapsedTime) {
  if (duration == 0) {
    return 1;
  }

  // We can increase curentIteration by more than just one iteration if the
  // animation delay is negative, thus we are using this division to get the
  // number of iterations that have passed since the previous animation update
  // (deltaIterations can be greater than for the first update of the
  // animation with the negative delay)
  const double progress = currentIterationElapsedTime / duration;
  const unsigned deltaIterations = static_cast<unsigned>(progress);

  if (deltaIterations > 0) {
    // Return 1 if the current iteration is the last one
    if (currentIteration == iterationCount) {
      return 1;
    }

    currentIteration += deltaIterations;
    previousIterationsDuration = (currentIteration - 1) * duration;

    if (direction == normal || direction == reverse) {
      previousProgress.reset();
      previousToPreviousProgress.reset();
    }
  }

  // If the current iteration changes, the progress must be updated
  // respectively not to contain the progress of the previous iteration
  return progress - deltaIterations;
}

double AnimationProgressProvider::applyAnimationDirection(
    double progress) const {
  switch (direction) {
    case normal:
      return progress;
    case reverse:
      return 1.0 - progress;
    case alternate:
      return currentIteration % 2 == 0 ? 1.0 - progress : progress;
    case alternateReverse:
      return currentIteration % 2 == 0 ? progress : 1.0 - progress;
  }
}

} // namespace reanimated
