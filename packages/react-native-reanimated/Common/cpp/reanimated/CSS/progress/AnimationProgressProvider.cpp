#include <reanimated/CSS/progress/AnimationProgressProvider.h>

namespace reanimated::css {

AnimationProgressProvider::AnimationProgressProvider(
    const double timestamp,
    const double duration,
    const double delay,
    const double iterationCount,
    const AnimationDirection direction,
    std::shared_ptr<Easing> easing,
    std::shared_ptr<KeyframeEasings> keyframeEasings)
    : RawProgressProvider(timestamp, duration, delay),
      iterationCount_(iterationCount),
      direction_(direction),
      easing_(std::move(easing)),
      keyframeEasings_(std::move(keyframeEasings)) {}

void AnimationProgressProvider::setIterationCount(double iterationCount) {
  iterationCount_ = iterationCount;
}

void AnimationProgressProvider::setDirection(AnimationDirection direction) {
  direction_ = direction;
}

void AnimationProgressProvider::setEasing(std::shared_ptr<Easing> easing) {
  easing_ = std::move(easing);
}

AnimationDirection AnimationProgressProvider::getDirection() const {
  return direction_;
}

double AnimationProgressProvider::getGlobalProgress() const {
  return applyAnimationDirection(rawProgress_.value_or(0));
}

AnimationProgressState AnimationProgressProvider::getState() const {
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

double AnimationProgressProvider::getPauseTimestamp() const {
  return pauseTimestamp_;
}

double AnimationProgressProvider::getTotalPausedTime(
    const double timestamp) const {
  return pauseTimestamp_ > 0
      ? (totalPausedTime_ + (timestamp - pauseTimestamp_))
      : totalPausedTime_;
}

double AnimationProgressProvider::getStartTimestamp(
    const double timestamp) const {
  // Start timestamp is the timestamp when the first animation keyframe
  // should be applied (it depends on the animation delay and the total
  // time when the animation was paused)
  return creationTimestamp_ + delay_ + getTotalPausedTime(timestamp);
}

double AnimationProgressProvider::getKeyframeProgress(
    const double fromOffset,
    const double toOffset) const {
  if (fromOffset == toOffset) {
    return 1;
  }

  const auto keyframeProgress =
      (getGlobalProgress() - fromOffset) / (toOffset - fromOffset);

  // Use the overridden easing function if it was overridden for the
  // current keyframe
  const auto it = keyframeEasings_->find(fromOffset);
  if (it != keyframeEasings_->end()) {
    return it->second->calculate(keyframeProgress);
  }

  return easing_->calculate(keyframeProgress);
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

void AnimationProgressProvider::resetProgress() {
  RawProgressProvider::resetProgress();
  currentIteration_ = 1;
  previousIterationsDuration_ = 0;
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

std::optional<double> AnimationProgressProvider::calculateRawProgress(
    const double timestamp) {
  const auto startTimestamp = getStartTimestamp(timestamp);

  if (timestamp < startTimestamp) {
    return std::nullopt;
  }

  const auto currentIterationElapsedTime =
      timestamp - (startTimestamp + previousIterationsDuration_);
  const auto iterationProgress =
      updateIterationProgress(currentIterationElapsedTime);

  if (shouldFinish(timestamp)) {
    // Override current progress for the last update in the last iteration to
    // ensure that animation finishes exactly at the specified iteration
    const auto intPart = std::floor(iterationCount_);
    return intPart == iterationCount_ ? 1 : iterationCount_ - intPart;
  }

  return iterationProgress;
}

double AnimationProgressProvider::updateIterationProgress(
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
    if (iterationCount_ != -1 &&
        currentIteration_ + deltaIterations > iterationCount_) {
      currentIteration_ = iterationCount_;
      return 1;
    }

    currentIteration_ += deltaIterations;
    previousIterationsDuration_ = (currentIteration_ - 1) * duration_;
  }

  // If the current iteration changes, the progress must be updated
  // respectively not to contain the progress of the previous iteration
  return progress - deltaIterations;
}

double AnimationProgressProvider::applyAnimationDirection(
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
