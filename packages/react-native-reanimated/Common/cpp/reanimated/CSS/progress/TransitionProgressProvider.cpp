#include <glog/logging.h>
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
    const time_t timestamp) const {
  return delay_ - (timestamp - startTime_);
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
  if (!propertyProgressProviders_.empty()) {
    return TransitionProgressState::RUNNING;
  }
  return TransitionProgressState::PENDING;
}

double TransitionProgressProvider::getMinDelay(const time_t timestamp) const {
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

std::optional<TransitionPropertyProgressProvider>
TransitionProgressProvider::getPropertyProgressProvider(
    const std::string &propertyName) const {
  const auto &it = propertyProgressProviders_.find(propertyName);
  if (it == propertyProgressProviders_.end()) {
    return std::nullopt;
  }
  return it->second;
}

void TransitionProgressProvider::runProgressProviders(
    jsi::Runtime &rt,
    const time_t timestamp,
    const PropertyNames &changedPropertyNames) {
  for (const auto &propertyName : changedPropertyNames) {
    auto propertyProgressProviderIt =
        propertyProgressProviders_.find(propertyName);

    if (propertyProgressProviderIt == propertyProgressProviders_.end()) {
      propertyProgressProviderIt =
          propertyProgressProviders_
              .emplace(
                  propertyName,
                  TransitionPropertyProgressProvider(
                      duration_, delay_, easingFunction_))
              .first;
    } else {
      propertyProgressProviderIt->second.resetProgress();
    }

    propertyProgressProviderIt->second.start(timestamp);
  }
}

void TransitionProgressProvider::update(const time_t timestamp) {
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
