#include <reanimated/CSS/progress/TransitionProgressProvider.h>

#include <limits>
#include <memory>
#include <string>
#include <unordered_set>
#include <utility>

namespace reanimated::css {

// TransitionPropertyProgressProvider

TransitionPropertyProgressProvider::TransitionPropertyProgressProvider(
    const double timestamp,
    const double duration,
    const double delay,
    const EasingFunction &easingFunction)
    : RawProgressProvider(timestamp, duration, delay), easingFunction_(easingFunction) {}

TransitionPropertyProgressProvider::TransitionPropertyProgressProvider(
    const double timestamp,
    const double duration,
    const double delay,
    const EasingFunction &easingFunction,
    const double reversingShorteningFactor)
    : RawProgressProvider(timestamp, duration, delay),
      easingFunction_(easingFunction),
      reversingShorteningFactor_(reversingShorteningFactor) {}

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

std::unordered_set<std::string> TransitionProgressProvider::flushRemovedProperties() {
  auto removedProperties = std::move(removedProperties_);
  removedProperties_.clear();
  return removedProperties;
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
      // Track removed property for interpolator cleanup
      removedProperties_.insert(it->first);
      it = propertyProgressProviders_.erase(it);
    } else {
      ++it;
    }
  }
}

void TransitionProgressProvider::removeProgressProviders(const PropertyNames &propertyNames) {
  for (const auto &propertyName : propertyNames) {
    propertyProgressProviders_.erase(propertyName);
    // Also add to removedProperties so interpolators can be cleaned up
    removedProperties_.insert(propertyName);
  }
}

void TransitionProgressProvider::runProgressProviders(
    const double timestamp,
    const CSSTransitionPropertiesSettings &propertiesSettings,
    const ChangedProps &changedProps,
    const std::unordered_set<std::string> &reversedPropertyNames) {
  // Handle removed properties first
  if (!changedProps.removedPropertyNames.empty()) {
    removeProgressProviders(changedProps.removedPropertyNames);
  }

  // Then handle changed properties
  for (const auto &propertyName : changedProps.changedPropertyNames) {
    const auto propertySettingsOptional = getTransitionPropertySettings(propertiesSettings, propertyName);

    if (!propertySettingsOptional.has_value()) {
      throw std::invalid_argument("[Reanimated] Property '" + propertyName + "' is not a valid transition property");
    }

    const auto &propertySettings = propertySettingsOptional.value();
    const auto it = propertyProgressProviders_.find(propertyName);

    if (it != propertyProgressProviders_.end()) {
      const auto &progressProvider = it->second;
      progressProvider->update(timestamp);

      if (reversedPropertyNames.find(propertyName) != reversedPropertyNames.end() &&
          progressProvider->getState() != TransitionProgressState::Finished) {
        // Create reversing shortening progress provider for interrupted
        // reversing transition
        propertyProgressProviders_.insert_or_assign(
            propertyName, createReversingShorteningProgressProvider(timestamp, propertySettings, *progressProvider));
        continue;
      }
    }

    // Create progress provider with the new settings
    propertyProgressProviders_.insert_or_assign(
        propertyName,
        std::make_shared<TransitionPropertyProgressProvider>(
            timestamp, propertySettings.duration, propertySettings.delay, propertySettings.easingFunction));
  }
}

void TransitionProgressProvider::update(const double timestamp) {
  for (const auto &[propertyName, propertyProgressProvider] : propertyProgressProviders_) {
    propertyProgressProvider->update(timestamp);

    // Track finished properties for removal
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
      newReversingShorteningFactor);
}

} // namespace reanimated::css
