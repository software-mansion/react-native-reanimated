#include <reanimated/CSS/progress/transition/TransitionPropertyProgressProvider.h>

namespace reanimated::css {

TransitionPropertyProgressProvider::TransitionPropertyProgressProvider(
    const double timestamp,
    const double duration,
    const double delay,
    const EasingFunction &easingFunction)
    : TimeProgressProviderBase(timestamp, duration, delay),
      easingFunction_(easingFunction) {}

TransitionPropertyProgressProvider::TransitionPropertyProgressProvider(
    const double timestamp,
    const double duration,
    const double delay,
    const EasingFunction &easingFunction,
    const double reversingShorteningFactor)
    : TimeProgressProviderBase(timestamp, duration, delay),
      easingFunction_(easingFunction),
      reversingShorteningFactor_(reversingShorteningFactor) {}

double TransitionPropertyProgressProvider::getGlobalProgress() const {
  return rawProgress_.value_or(0);
}

double TransitionPropertyProgressProvider::getKeyframeProgress(
    const double fromOffset,
    const double toOffset) const {
  if (fromOffset == toOffset) {
    return 1;
  }
  return easingFunction_(getGlobalProgress());
}

double TransitionPropertyProgressProvider::getRemainingDelay(
    const double timestamp) const {
  return delay_ - (timestamp - creationTimestamp_);
}

double TransitionPropertyProgressProvider::getReversingShorteningFactor()
    const {
  return reversingShorteningFactor_;
}

TransitionProgressState TransitionPropertyProgressProvider::getState() const {
  if (!rawProgress_.has_value()) {
    return TransitionProgressState::Pending;
  }
  const auto rawProgress = rawProgress_.value();
  if (rawProgress >= 1) {
    return TransitionProgressState::Finished;
  }
  return TransitionProgressState::Running;
}

std::optional<double> TransitionPropertyProgressProvider::calculateRawProgress(
    const double timestamp) {
  if (duration_ == 0) {
    return 1;
  }
  return getElapsedTime(timestamp) / duration_;
}

double TransitionPropertyProgressProvider::getElapsedTime(
    const double timestamp) const {
  return timestamp - (creationTimestamp_ + delay_);
}

} // namespace reanimated::css
