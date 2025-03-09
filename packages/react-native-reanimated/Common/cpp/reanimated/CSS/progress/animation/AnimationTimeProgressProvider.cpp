#include <reanimated/CSS/progress/animation/AnimationTimeProgressProvider.h>

namespace reanimated::css {

AnimationTimeProgressProvider::AnimationTimeProgressProvider(
    const double timestamp,
    const double duration,
    const double delay,
    const double iterationCount,
    const AnimationDirection direction,
    EasingFunction easingFunction,
    const std::shared_ptr<KeyframeEasingFunctions> &keyframeEasingFunctions)
    : AnimationProgressProviderBase(
          iterationCount,
          direction,
          std::move(easingFunction),
          keyframeEasingFunctions),
      TimeProgressProviderBase(timestamp, duration, delay) {}

double AnimationTimeProgressProvider::getGlobalProgress() const {
  return applyAnimationDirection(rawProgress_.value_or(0));
}

double AnimationTimeProgressProvider::getKeyframeProgress(
    const double fromOffset,
    const double toOffset) const {
  if (fromOffset == toOffset) {
    return 1;
  }

  const auto keyframeProgress =
      (getGlobalProgress() - fromOffset) / (toOffset - fromOffset);

  // Use the overridden easing function if it was overridden for the
  // current keyframe
  const auto easingFunctionIt = keyframeEasingFunctions_->find(fromOffset);
  if (easingFunctionIt != keyframeEasingFunctions_->end()) {
    return easingFunctionIt->second(keyframeProgress);
  }

  return easingFunction_(keyframeProgress);
}

AnimationProgressState AnimationTimeProgressProvider::getState(
    const double timestamp) const {
  if (shouldFinish(timestamp)) {
    return AnimationProgressState::Finished;
  }
  if (pauseTimestamp_ > 0) {
    return AnimationProgressState::Paused;
  }
  if (!rawProgress_.has_value()) {
    return AnimationProgressState::Pending;
  }
  const auto rawProgress = rawProgress_.value();
  if (rawProgress >= 1) {
    return AnimationProgressState::Finished;
  }
  return AnimationProgressState::Running;
}

double AnimationTimeProgressProvider::getPauseTimestamp() const {
  return pauseTimestamp_;
}

double AnimationTimeProgressProvider::getTotalPausedTime(
    const double timestamp) const {
  return pauseTimestamp_ > 0
      ? (totalPausedTime_ + (timestamp - pauseTimestamp_))
      : totalPausedTime_;
}

double AnimationTimeProgressProvider::getStartTimestamp(
    const double timestamp) const {
  // Start timestamp is the timestamp when the first animation keyframe
  // should be applied (it depends on the animation delay and the total
  // time when the animation was paused)
  return creationTimestamp_ + delay_ + getTotalPausedTime(timestamp);
}

void AnimationTimeProgressProvider::pause(const double timestamp) {
  pauseTimestamp_ = timestamp;
}

void AnimationTimeProgressProvider::play(const double timestamp) {
  if (pauseTimestamp_ > 0) {
    totalPausedTime_ += timestamp - pauseTimestamp_;
  }
  pauseTimestamp_ = 0;
}

void AnimationTimeProgressProvider::resetProgress() {
  TimeProgressProviderBase::resetProgress();
  currentIteration_ = 1;
  previousIterationsDuration_ = 0;
}

bool AnimationTimeProgressProvider::shouldFinish(const double timestamp) const {
  if (iterationCount_ == 0) {
    return true;
  }
  if (iterationCount_ == -1) {
    return false;
  }
  const auto elapsedDuration = timestamp - getStartTimestamp(timestamp);
  return elapsedDuration >= duration_ * iterationCount_;
}

std::optional<double> AnimationTimeProgressProvider::calculateRawProgress(
    const double timestamp) {
  const double currentIterationElapsedTime = timestamp -
      (creationTimestamp_ + delay_ + previousIterationsDuration_ +
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

double AnimationTimeProgressProvider::updateIterationProgress(
    const double currentIterationElapsedTime) {
  if (duration_ == 0) {
    return 1;
  }
  // We can increase curentIteration by more than just one iteration if the
  // animation delay is negative, thus we are using this division to get the
  // number of iterations that have passed since the previous animation update
  // (deltaIterations can be greater than for the first update of the
  // animation with the negative delay)
  const double progress = currentIterationElapsedTime / duration_;
  const auto deltaIterations = static_cast<unsigned>(progress);

  if (deltaIterations > 0) {
    // Return 1 if the current iteration is the last one
    if (currentIteration_ == iterationCount_) {
      return 1;
    }

    currentIteration_ += deltaIterations;
    previousIterationsDuration_ = (currentIteration_ - 1) * duration_;
  }

  // If the current iteration changes, the progress must be updated
  // respectively not to contain the progress of the previous iteration
  return progress - deltaIterations;
}

double AnimationTimeProgressProvider::applyAnimationDirection(
    const double progress) const {
  switch (direction_) {
    case AnimationDirection::Normal:
      return progress;
    case AnimationDirection::Reverse:
      return 1.0 - progress;
    case AnimationDirection::Alternate:
      return currentIteration_ % 2 == 0 ? 1.0 - progress : progress;
    case AnimationDirection::AlternateReverse:
      return currentIteration_ % 2 == 0 ? progress : 1.0 - progress;
  }
}

} // namespace reanimated::css
