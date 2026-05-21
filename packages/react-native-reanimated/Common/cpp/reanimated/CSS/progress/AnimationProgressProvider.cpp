#include <reanimated/CSS/progress/AnimationProgressProvider.h>

#include <memory>
#include <utility>

namespace reanimated::css {

AnimationProgressProvider::AnimationProgressProvider(
    const double timestamp,
    const double duration,
    const double delay,
    const double iterationCount,
    const AnimationDirection direction,
    EasingFunction easingFunction,
    const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs)
    : RawProgressProvider(timestamp, duration, delay),
      iterationCount_(iterationCount),
      direction_(direction),
      easingFunction_(std::move(easingFunction)),
      keyframeEasingConfigs_(keyframeEasingConfigs) {}

void AnimationProgressProvider::setIterationCount(double iterationCount) {
  iterationCount_ = iterationCount;
}

void AnimationProgressProvider::setDirection(AnimationDirection direction) {
  direction_ = direction;
}

void AnimationProgressProvider::setEasingFunction(const EasingFunction &easingFunction) {
  easingFunction_ = easingFunction;
}

AnimationDirection AnimationProgressProvider::getDirection() const {
  return direction_;
}

double AnimationProgressProvider::getGlobalProgress() const {
  return applyAnimationDirection(rawProgress_.value_or(0));
}

double AnimationProgressProvider::getKeyframeProgress(const double fromOffset, const double toOffset) const {
  if (fromOffset == toOffset) {
    return 1;
  }

  const auto keyframeProgress = (getGlobalProgress() - fromOffset) / (toOffset - fromOffset);

  // Use the overridden easing function if it was overridden for the
  // current keyframe
  const auto easingConfigIt = keyframeEasingConfigs_->find(fromOffset);
  if (easingConfigIt != keyframeEasingConfigs_->end()) {
    return getEasingFunctionFromConfig(easingConfigIt->second)(keyframeProgress);
  }

  return easingFunction_(keyframeProgress);
}

AnimationProgressState AnimationProgressProvider::getState() const {
  return state_;
}

double AnimationProgressProvider::getStartTimestamp(const double timestamp) const {
  // Start timestamp is the timestamp when the first animation keyframe
  // should be applied (it depends on the animation delay and the total
  // time when the animation was paused)
  return creationTimestamp_ + delay_ + getTotalPausedTime(timestamp);
}

void AnimationProgressProvider::pause(const double timestamp) {
  pauseTimestamp_ = timestamp;
}

void AnimationProgressProvider::play(const double timestamp) {
  if (pauseTimestamp_ > 0) {
    totalPausedTime_ += timestamp - pauseTimestamp_;
  }
  pauseTimestamp_ = 0;
}

void AnimationProgressProvider::update(const double timestamp) {
  RawProgressProvider::update(timestamp);
  state_ = computeState(timestamp);
}

void AnimationProgressProvider::resetProgress() {
  RawProgressProvider::resetProgress();
  currentIteration_ = 1;
  previousIterationsDuration_ = 0;
  state_ = AnimationProgressState::Pending;
}

std::optional<double> AnimationProgressProvider::calculateRawProgress(const double timestamp) {
  const double startTimestamp = getStartTimestamp(timestamp);
  const double currentIterationElapsedTime = timestamp - (startTimestamp + previousIterationsDuration_);

  if (currentIterationElapsedTime < 0) {
    return std::nullopt;
  }

  const double iterationProgress = updateIterationProgress(currentIterationElapsedTime);

  if (shouldFinish(timestamp)) {
    // Override current progress for the last update in the last iteration to
    // ensure that animation finishes exactly at the specified iteration
    const double intPart = std::floor(iterationCount_);
    return intPart == iterationCount_ ? 1 : iterationCount_ - intPart;
  }

  return iterationProgress;
}

double AnimationProgressProvider::getTotalPausedTime(const double timestamp) const {
  if (pauseTimestamp_ > 0) {
    return totalPausedTime_ + (timestamp - pauseTimestamp_);
  }
  return totalPausedTime_;
}

bool AnimationProgressProvider::shouldFinish(const double timestamp) const {
  if (iterationCount_ == 0) {
    return true;
  }
  if (iterationCount_ == -1) {
    return false;
  }
  const auto elapsedDuration = timestamp - getStartTimestamp(timestamp);
  return elapsedDuration >= duration_ * iterationCount_;
}

AnimationProgressState AnimationProgressProvider::computeState(const double timestamp) const {
  if (shouldFinish(timestamp)) {
    return AnimationProgressState::Finished;
  }
  if (pauseTimestamp_ > 0) {
    return AnimationProgressState::Paused;
  }
  if (timestamp < getStartTimestamp(timestamp) || !rawProgress_.has_value()) {
    return AnimationProgressState::Pending;
  }
  return AnimationProgressState::Running;
}

double AnimationProgressProvider::updateIterationProgress(const double currentIterationElapsedTime) {
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
    currentIteration_ += deltaIterations;
    previousIterationsDuration_ = (currentIteration_ - 1) * duration_;
  }

  // If the current iteration changes, the progress must be updated
  // respectively not to contain the progress of the previous iteration
  return progress - deltaIterations;
}

double AnimationProgressProvider::applyAnimationDirection(const double progress) const {
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
