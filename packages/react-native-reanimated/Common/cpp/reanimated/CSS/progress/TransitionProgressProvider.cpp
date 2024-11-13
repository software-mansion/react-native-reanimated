#include <reanimated/CSS/progress/TransitionProgressProvider.h>

namespace reanimated {

// TransitionPropertyProgressProvider

TransitionProgressState TransitionPropertyProgressProvider::getState() const {
  if (!rawProgress_.has_value()) {
    return TransitionProgressState::PENDING;
  }
  const auto rawProgress = rawProgress_.value();
  if (rawProgress >= 1) {
    return TransitionProgressState::FINISHED;
  }
  return TransitionProgressState::RUNNING;
}

double TransitionPropertyProgressProvider::getRemainingDelay(
    const double timestamp) const {
  return delay_ - (timestamp - creationTimestamp_);
}

std::optional<double> TransitionPropertyProgressProvider::calculateRawProgress(
    const double timestamp) {
  return getElapsedTime(timestamp) / duration_;
}

double TransitionPropertyProgressProvider::decorateProgress(
    const double progress) const {
  return easingFunction_(progress);
}

double TransitionPropertyProgressProvider::getElapsedTime(
    const double timestamp) const {
  return timestamp - (creationTimestamp_ + delay_);
}

// TransitionProgressProvider

TransitionProgressProvider::TransitionProgressProvider(
    const double duration,
    const double delay,
    const EasingFunction &easingFunction)
    : duration_(duration), delay_(delay), easingFunction_(easingFunction) {}

TransitionProgressState TransitionProgressProvider::getState() const {
  if (!propertyProgressProviders_.empty()) {
    return TransitionProgressState::RUNNING;
  }
  return TransitionProgressState::PENDING;
}

double TransitionProgressProvider::getMinDelay(const double timestamp) const {
  double minDelay = delay_;

  for (const auto &[_, propertyProgressProvider] : propertyProgressProviders_) {
    const auto remainingDelay =
        propertyProgressProvider.getRemainingDelay(timestamp);
    if (remainingDelay < minDelay) {
      minDelay = remainingDelay;
    }
  }

  return minDelay;
}

void TransitionProgressProvider::discardIrrelevantProgressProviders(
    const std::unordered_set<std::string> &transitionPropertyNames) {
  for (auto it = propertyProgressProviders_.begin();
       it != propertyProgressProviders_.end();) {
    // Remove property progress providers for properties not specified in the
    // transition property names
    if (transitionPropertyNames.find(it->first) ==
        transitionPropertyNames.end()) {
      it = propertyProgressProviders_.erase(it);
    } else {
      ++it;
    }
  }
}

void TransitionProgressProvider::runProgressProviders(
    jsi::Runtime &rt,
    const double timestamp,
    const PropertyNames &changedPropertyNames) {
  for (const auto &propertyName : changedPropertyNames) {
    // Always create the new progress provider with the new settings
    propertyProgressProviders_.insert_or_assign(
        propertyName,
        TransitionPropertyProgressProvider(
            timestamp, duration_, delay_, easingFunction_));
  }
}

void TransitionProgressProvider::update(const double timestamp) {
  for (const auto &propertyName : propertiesToRemove_) {
    propertyProgressProviders_.erase(propertyName);
  }
  propertiesToRemove_.clear();

  for (auto &[propertyName, propertyProgressProvider] :
       propertyProgressProviders_) {
    propertyProgressProvider.update(timestamp);
    if (propertyProgressProvider.getState() ==
        TransitionProgressState::FINISHED) {
      propertiesToRemove_.emplace_back(propertyName);
    }
  }
}

} // namespace reanimated
