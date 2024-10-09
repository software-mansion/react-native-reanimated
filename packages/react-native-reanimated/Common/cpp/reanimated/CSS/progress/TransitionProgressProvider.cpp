#include <reanimated/CSS/progress/TransitionProgressProvider.h>

namespace reanimated {

// TransitionPropertyProgressProvider

void TransitionPropertyProgressProvider::run(const time_t timestamp) {
  resetProgress();
  start(timestamp);
}

std::optional<double> TransitionPropertyProgressProvider::calculateRawProgress(
    const time_t timestamp) {
  return getElapsedTime(timestamp) / duration_;
}

double TransitionPropertyProgressProvider::getElapsedTime(
    const time_t timestamp) const {
  return timestamp - (startTime_ + delay_);
}

// TransitionProgressProvider

TransitionProgressProvider::TransitionProgressProvider(
    const double duration,
    const double delay,
    const EasingFunction easingFunction)
    : duration_(duration), delay_(delay), easingFunction_(easingFunction) {}

TransitionProgressState TransitionProgressProvider::getState() const {
  if (!runningProperties_.empty()) {
    return TransitionProgressState::RUNNING;
  }
  return TransitionProgressState::PENDING;
}

std::optional<TransitionPropertyProgressProvider>
TransitionProgressProvider::getPropertyProgressProvider(
    const std::string &propertyName) const {
  const auto &it = propertyProgressProviders_.find(propertyName);
  if (it == propertyProgressProviders_.end()) {
    return std::nullopt;
  }
  return it->second;
}

void TransitionProgressProvider::addProperties(
    const PropertyNames &propertyNames) {
  for (const auto &propertyName : propertyNames) {
    propertyProgressProviders_.emplace(
        propertyName,
        TransitionPropertyProgressProvider(duration_, delay_, easingFunction_));
  }
}

void TransitionProgressProvider::removeProperties(
    const PropertyNames &propertyNames) {
  for (const auto &propertyName : propertyNames) {
    propertyProgressProviders_.erase(propertyName);
  }
}

void TransitionProgressProvider::runProgressProviders(
    const PropertyNames &propertyNames,
    const time_t timestamp) {
  for (const auto &propertyName : propertyNames) {
    auto &propertyProgressProvider =
        propertyProgressProviders_.at(propertyName);
    propertyProgressProvider.resetProgress();
    propertyProgressProvider.start(timestamp);

    const auto startTimestamp = propertyProgressProvider.getStartTime() +
        propertyProgressProvider.getDelay();

    if (startTimestamp > timestamp) {
      runningProperties_.erase(propertyName);
      if (delayedProperties_.find(propertyName) != delayedProperties_.end()) {
        // TODO - remove from delayed props queue
      }
      delayedPropertiesQueue_.emplace(startTimestamp, propertyName);
      delayedProperties_.insert(propertyName);
    } else {
      runningProperties_.insert(propertyName);
    }
  }
}

void TransitionProgressProvider::update(const time_t timestamp) {
  activateDelayedProperties(timestamp);

  PropertyNames propertiesToDeactivate;

  for (const auto &propertyName : runningProperties_) {
    auto &propertyProgressProvider =
        propertyProgressProviders_.at(propertyName);
    propertyProgressProvider.update(timestamp);
    if (propertyProgressProvider.getState(timestamp) ==
        TransitionProgressState::PENDING) {
      // propertiesToDeactivate.emplace_back(propertyName);
    }
  }

  for (const auto &propertyName : propertiesToDeactivate) {
    runningProperties_.erase(propertyName);
  }
}

void TransitionProgressProvider::activateDelayedProperties(
    const time_t timestamp) {
  while (!delayedPropertiesQueue_.empty() &&
         delayedPropertiesQueue_.top().first <= timestamp) {
    const auto [_, propertyName] = delayedPropertiesQueue_.top();
    delayedPropertiesQueue_.pop();
    delayedProperties_.erase(propertyName);
    runningProperties_.insert(propertyName);
  }
}

} // namespace reanimated
