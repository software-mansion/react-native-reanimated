#include <reanimated/CSS/progress/TransitionProgressProvider.h>

#include <reanimated/CSS/utils/reversingShortening.h>

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
    EasingConfig easing)
    : RawProgressProvider(timestamp, duration, delay),
      easing_(std::move(easing)),
      easingFunction_(getEasingFunctionFromConfig(easing_)) {}

TransitionPropertyProgressProvider::TransitionPropertyProgressProvider(
    const double timestamp,
    const double duration,
    const double delay,
    EasingConfig easing,
    const double reversingShorteningFactor)
    : RawProgressProvider(timestamp, duration, delay),
      easing_(std::move(easing)),
      easingFunction_(getEasingFunctionFromConfig(easing_)),
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

ReversingState TransitionPropertyProgressProvider::getReversingState() const {
  return {reversingShorteningFactor_, creationTimestamp_ + delay_, duration_, delay_, easing_};
}

TransitionProgressState TransitionPropertyProgressProvider::getState() const {
  // rawProgress_ is empty until the property's delay has passed
  // (RawProgressProvider::update resets it while timestamp < creationTimestamp + delay)
  if (!rawProgress_.has_value()) {
    return TransitionProgressState::Pending;
  }
  if (rawProgress_.value() >= 1) {
    return TransitionProgressState::Idle;
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
  for (const auto &[_, progressProvider] : propertyProgressProviders_) {
    const auto state = progressProvider->getState();
    if (state != TransitionProgressState::Idle) {
      return state;
    }
  }

  return TransitionProgressState::Idle;
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

void TransitionProgressProvider::runProgressProvider(
    const std::string &propertyName,
    const bool isReversed,
    const double timestamp) {

  const auto &settings = propertySettings_.at(propertyName);

  const auto providerIt = propertyProgressProviders_.find(propertyName);

  if (providerIt != propertyProgressProviders_.end()) {
    const auto &progressProvider = providerIt->second;
    progressProvider->update(timestamp);

    if (isReversed && progressProvider->getState() != TransitionProgressState::Idle) {
      // Create reversing shortening progress provider for interrupted reversing transition
      propertyProgressProviders_.insert_or_assign(
          propertyName, createReversingShorteningProgressProvider(timestamp, settings, *progressProvider));
      return;
    }
  }

  // Create progress provider with the new settings
  propertyProgressProviders_.insert_or_assign(
      propertyName,
      std::make_shared<TransitionPropertyProgressProvider>(
          timestamp, settings.duration, settings.delay, settings.easingConfig));
}

void TransitionProgressProvider::removeProperties(const std::vector<std::string> &propertyNames) {
  for (const auto &propertyName : propertyNames) {
    propertyProgressProviders_.erase(propertyName);
  }
}

void TransitionProgressProvider::removeProperty(const std::string &propertyName) {
  propertyProgressProviders_.erase(propertyName);
}

void TransitionProgressProvider::discardFinishedProgressProviders() {
  for (auto it = propertyProgressProviders_.begin(); it != propertyProgressProviders_.end();) {
    if (it->second->getState() == TransitionProgressState::Idle) {
      it = propertyProgressProviders_.erase(it);
    } else {
      ++it;
    }
  }
}

void TransitionProgressProvider::update(const double timestamp) {
  removedProperties_.clear();

  for (const auto &[propertyName, propertyProgressProvider] : propertyProgressProviders_) {
    propertyProgressProvider->update(timestamp);
    if (propertyProgressProvider->getState() == TransitionProgressState::Idle) {
      removedProperties_.insert(propertyName);
    }
  }
}

std::shared_ptr<TransitionPropertyProgressProvider>
TransitionProgressProvider::createReversingShorteningProgressProvider(
    const double timestamp,
    const CSSTransitionPropertySettings &propertySettings,
    const TransitionPropertyProgressProvider &existingProgressProvider) {
  const auto rs = reverseShorten(
      existingProgressProvider.getReversingState(),
      timestamp,
      propertySettings.duration,
      propertySettings.delay,
      propertySettings.easingConfig);

  return std::make_shared<TransitionPropertyProgressProvider>(timestamp, rs.duration, rs.delay, rs.easing, rs.factor);
}

void TransitionProgressProvider::setPropertySettings(const PropertiesSettingsMap &changedPropertiesSettings) {
  for (const auto &[propertyName, propertySettings] : changedPropertiesSettings) {
    propertySettings_[propertyName] = propertySettings;
  }
}

CSSTransitionPropertySettings TransitionProgressProvider::getPropertySettings(const std::string &propertyName) const {
  return propertySettings_.at(propertyName);
}

} // namespace reanimated::css
