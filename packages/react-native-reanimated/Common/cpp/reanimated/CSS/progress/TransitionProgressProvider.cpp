#include <reanimated/CSS/progress/TransitionProgressProvider.h>

#include <limits>
#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

// TransitionPropertyProgressProvider
TransitionPropertyProgressProvider::TransitionPropertyProgressProvider(
    const double timestamp,
    const double duration,
    const double delay,
    const EasingFunction &easingFunction,
    const bool allowDiscrete)
    : RawProgressProvider(timestamp, duration, delay), easingFunction_(easingFunction), allowDiscrete_(allowDiscrete) {}
TransitionPropertyProgressProvider::TransitionPropertyProgressProvider(
    const double timestamp,
    const double duration,
    const double delay,
    const EasingFunction &easingFunction,
    const bool allowDiscrete,
    const double reversingShorteningFactor)
    : RawProgressProvider(timestamp, duration, delay),
      easingFunction_(easingFunction),
      reversingShorteningFactor_(reversingShorteningFactor),
      allowDiscrete_(allowDiscrete) {}

double TransitionPropertyProgressProvider::getGlobalProgress() const {
  return rawProgress_.value_or(0);
}

double TransitionPropertyProgressProvider::getKeyframeProgress(const double fromOffset, const double toOffset) const {
  if (fromOffset == toOffset) {
    return 1;
  }
  return easingFunction_(getGlobalProgress());
}

double TransitionPropertyProgressProvider::getRemainingDelay(const double timestamp) const {
  return delay_ - (timestamp - creationTimestamp_);
}

double TransitionPropertyProgressProvider::getReversingShorteningFactor() const {
  return reversingShorteningFactor_;
}

double TransitionPropertyProgressProvider::getFallbackInterpolateThreshold() const {
  return allowDiscrete_ ? 0.5 : 0;
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

std::optional<double> TransitionPropertyProgressProvider::calculateRawProgress(const double timestamp) {
  if (duration_ == 0) {
    return 1;
  }
  return getElapsedTime(timestamp) / duration_;
}

double TransitionPropertyProgressProvider::getElapsedTime(const double timestamp) const {
  return timestamp - (creationTimestamp_ + delay_);
}

// TransitionProgressProvider

TransitionProgressState TransitionProgressProvider::getState() const {
  for (const auto &[_, propertyProgressProvider] : propertyProgressProviders_) {
    if (propertyProgressProvider->getState() == TransitionProgressState::Running) {
      return TransitionProgressState::Running;
    }
  }
  return TransitionProgressState::Pending;
}

double TransitionProgressProvider::getMinDelay(const double timestamp) const {
  if (propertyProgressProviders_.empty()) {
    return 0;
  }
  auto minDelay = std::numeric_limits<double>::max();

  for (const auto &[_, propertyProgressProvider] : propertyProgressProviders_) {
    const auto remainingDelay = propertyProgressProvider->getRemainingDelay(timestamp);
    if (remainingDelay < minDelay) {
      minDelay = remainingDelay;
    }
  }

  return minDelay;
}

TransitionPropertyProgressProviders TransitionProgressProvider::getPropertyProgressProviders() const {
  return propertyProgressProviders_;
}

std::unordered_set<std::string> TransitionProgressProvider::getRemovedProperties() const {
  return removedProperties_;
}

void TransitionProgressProvider::discardFinishedProgressProviders() {
  for (auto it = propertyProgressProviders_.begin(); it != propertyProgressProviders_.end();) {
    if (it->second->getState() == TransitionProgressState::Finished) {
      it = propertyProgressProviders_.erase(it);
    } else {
      ++it;
    }
  }
}

void TransitionProgressProvider::discardIrrelevantProgressProviders(
    const std::unordered_set<std::string> &transitionPropertyNames) {
  for (auto it = propertyProgressProviders_.begin(); it != propertyProgressProviders_.end();) {
    // Remove property progress providers for properties not specified in the
    // transition property names
    if (transitionPropertyNames.find(it->first) == transitionPropertyNames.end()) {
      it = propertyProgressProviders_.erase(it);
    } else {
      ++it;
    }
  }
}

void TransitionProgressProvider::runProgressProviders(
    const double timestamp,
    const std::vector<TransitionPropertyUpdate> &propertyUpdates,
    const CSSTransitionPropertiesSettings &settings) {
  for (const auto &propertyUpdate : propertyUpdates) {
    const auto &propertyName = propertyUpdate.name;
    const auto status = propertyUpdate.status;

    // Handle removed properties
    if (status == TransitionPropertyStatus::Removed) {
      propertyProgressProviders_.erase(propertyName);
      continue;
    }

    const auto propertySettingsOptional = getTransitionPropertySettings(settings, propertyName);
    if (!propertySettingsOptional.has_value()) {
      throw std::runtime_error("[Reanimated] Settings not found for CSS transition property: '" + propertyName + "'");
    }

    const auto &propertySettings = propertySettingsOptional.value();
    const auto it = propertyProgressProviders_.find(propertyName);

    if (it != propertyProgressProviders_.end()) {
      const auto &progressProvider = it->second;
      progressProvider->update(timestamp);

      if (status == TransitionPropertyStatus::Reversed &&
          progressProvider->getState() != TransitionProgressState::Finished) {
        // Create reversing shortening progress provider for interrupted reversing transition
        propertyProgressProviders_.insert_or_assign(
            propertyName, createReversingShorteningProgressProvider(timestamp, propertySettings, *progressProvider));
        continue;
      }
    }

    // Create a new progress provider with the latest settings
    propertyProgressProviders_.insert_or_assign(
        propertyName,
        std::make_shared<TransitionPropertyProgressProvider>(
            timestamp,
            propertySettings.duration,
            propertySettings.delay,
            propertySettings.easingFunction,
            propertySettings.allowDiscrete));
  }
}

void TransitionProgressProvider::update(const double timestamp) {
  removedProperties_.clear();

  for (const auto &[propertyName, propertyProgressProvider] : propertyProgressProviders_) {
    propertyProgressProvider->update(timestamp);
    if (propertyProgressProvider->getState() == TransitionProgressState::Finished) {
      removedProperties_.insert(propertyName);
    }
  }
}

std::shared_ptr<TransitionPropertyProgressProvider>
TransitionProgressProvider::createReversingShorteningProgressProvider(
    const double timestamp,
    const CSSTransitionPropertySettings &propertySettings,
    const TransitionPropertyProgressProvider &existingProgressProvider) {
  const auto oldProgress = existingProgressProvider.getKeyframeProgress(0, 1);
  const auto oldReversingShorteningFactor = existingProgressProvider.getReversingShorteningFactor();
  auto newReversingShorteningFactor = oldProgress * oldReversingShorteningFactor + (1 - oldReversingShorteningFactor);

  return std::make_shared<TransitionPropertyProgressProvider>(
      timestamp,
      propertySettings.duration * newReversingShorteningFactor,
      propertySettings.delay < 0 ? newReversingShorteningFactor * propertySettings.delay : propertySettings.delay,
      propertySettings.easingFunction,
      propertySettings.allowDiscrete,
      newReversingShorteningFactor);
}

} // namespace reanimated::css
