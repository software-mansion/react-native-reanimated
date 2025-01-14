#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/progress/TransitionProgressProvider.h>

namespace reanimated {

// TransitionPropertyProgressProvider

TransitionPropertyProgressProvider::TransitionPropertyProgressProvider(
    const double timestamp,
    const double duration,
    const double delay,
    const EasingFunction &easingFunction)
    : RawProgressProvider(timestamp, duration, delay),
      easingFunction_(easingFunction) {}

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

bool TransitionPropertyProgressProvider::isFirstUpdate() const {
  return !previousRawProgress_.has_value();
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

// TransitionProgressProvider

TransitionProgressProvider::TransitionProgressProvider(
    const CSSTransitionPropertiesSettings &settings)
    : settings_(std::move(settings)) {}

void TransitionProgressProvider::setSettings(
    const CSSTransitionPropertiesSettings &settings) {
  settings_ = settings;
}

TransitionProgressState TransitionProgressProvider::getState() const {
  for (const auto &[_, propertyProgressProvider] : propertyProgressProviders_) {
    if (propertyProgressProvider->getState() ==
        TransitionProgressState::Running) {
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
    const auto remainingDelay =
        propertyProgressProvider->getRemainingDelay(timestamp);
    if (remainingDelay < minDelay) {
      minDelay = remainingDelay;
    }
  }

  return minDelay;
}

TransitionPropertyProgressProviders
TransitionProgressProvider::getPropertyProgressProviders() const {
  return propertyProgressProviders_;
}

std::unordered_set<std::string>
TransitionProgressProvider::getRemovedProperties() const {
  return removedProperties_;
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
    const double timestamp,
    const PropertyNames &changedPropertyNames,
    const std::unordered_set<std::string> &reversedPropertyNames) {
  for (const auto &propertyName : changedPropertyNames) {
    const auto propertySettings = getPropertySettings(propertyName);
    const auto progressProviderIt =
        propertyProgressProviders_.find(propertyName);

    if (progressProviderIt != propertyProgressProviders_.end()) {
      const auto &progressProvider = progressProviderIt->second;
      progressProvider->update(timestamp);

      if (reversedPropertyNames.find(propertyName) !=
              reversedPropertyNames.end() &&
          progressProvider->getState() != TransitionProgressState::Finished) {
        // Create reversing shortening progress provider for interrupted
        // reversing transition
        propertyProgressProviders_.insert_or_assign(
            propertyName,
            createReversingShorteningProgressProvider(
                timestamp, propertySettings, *progressProvider));
        continue;
      }
    }

    // Create progress provider with the new settings
    propertyProgressProviders_.insert_or_assign(
        propertyName,
        std::make_shared<TransitionPropertyProgressProvider>(
            timestamp,
            propertySettings.duration,
            propertySettings.delay,
            propertySettings.easingFunction));
  }
}

void TransitionProgressProvider::update(const double timestamp) {
  auto it = propertyProgressProviders_.begin();
  removedProperties_.clear();

  while (it != propertyProgressProviders_.end()) {
    const auto &propertyProgressProvider = it->second;
    propertyProgressProvider->update(timestamp);

    if (propertyProgressProvider->getState() ==
        TransitionProgressState::Finished) {
      removedProperties_.insert(it->first);
      it = propertyProgressProviders_.erase(it);
    } else {
      ++it;
    }
  }
}

CSSTransitionPropertySettings TransitionProgressProvider::getPropertySettings(
    const std::string &propertyName) const {
  // Find property settings or fallback to "all" settings if no property
  // specific settings are available
  const auto propertySettingsIt = settings_.find(propertyName);
  return (propertySettingsIt != settings_.end()) ? propertySettingsIt->second
                                                 : settings_.at("all");
}

std::shared_ptr<TransitionPropertyProgressProvider>
TransitionProgressProvider::createReversingShorteningProgressProvider(
    const double timestamp,
    const CSSTransitionPropertySettings &propertySettings,
    const TransitionPropertyProgressProvider &existingProgressProvider) {
  const auto oldProgress = existingProgressProvider.getKeyframeProgress(0, 1);
  const auto oldReversingShorteningFactor =
      existingProgressProvider.getReversingShorteningFactor();
  auto newReversingShorteningFactor =
      oldProgress * oldReversingShorteningFactor +
      (1 - oldReversingShorteningFactor);

  return std::make_shared<TransitionPropertyProgressProvider>(
      timestamp,
      propertySettings.duration * newReversingShorteningFactor,
      propertySettings.delay < 0
          ? newReversingShorteningFactor * propertySettings.delay
          : propertySettings.delay,
      propertySettings.easingFunction,
      newReversingShorteningFactor);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
