#include <reanimated/CSS/progress/TransitionProgressProvider.h>

#include <reanimated/CSS/utils/reversingShortening.h>

#include <algorithm>
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
    : TimeProgressProvider(timestamp, duration, delay),
      easing_(std::move(easing)),
      easingFunction_(getEasingFunctionFromConfig(easing_)) {}

TransitionPropertyProgressProvider::TransitionPropertyProgressProvider(
    const double timestamp,
    const double duration,
    const double delay,
    EasingConfig easing,
    const double reversingShorteningFactor)
    : TimeProgressProvider(timestamp, duration, delay),
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

void TransitionPropertyProgressProvider::setMilestoneReporter(RunLifecycle::Reporter reporter) {
  lifecycle_.setMilestoneReporter(std::move(reporter));
  lifecycle_.reachPhase(computePhase());
}

void TransitionPropertyProgressProvider::abort(const double timestamp) {
  // A cancel can arrive at a timestamp the provider has not been ticked to, and
  // the run still owes the milestones it crossed in between. Advancing first
  // also lets a run that has since finished report its end instead of a cancel.
  update(timestamp);
  cancelTimestamp_ = timestamp;
  lifecycle_.abort();
}

void TransitionPropertyProgressProvider::update(const double timestamp) {
  TimeProgressProvider::update(timestamp);
  lifecycle_.reachPhase(computePhase());
}

RunPhase TransitionPropertyProgressProvider::computePhase() const {
  switch (getState()) {
    case TransitionProgressState::Pending:
      return RunPhase::Before;
    case TransitionProgressState::Running:
      return RunPhase::Active;
    case TransitionProgressState::Idle:
      return RunPhase::After;
  }
  return RunPhase::Idle;
}

double TransitionPropertyProgressProvider::elapsedTimeAt(const MilestoneTime time) const {
  switch (time) {
    case MilestoneTime::IntervalStart:
      return intervalStart();
    case MilestoneTime::IntervalEnd:
      return duration_;
    case MilestoneTime::ActiveTime:
      return std::max(0.0, cancelTimestamp_ - (creationTimestamp_ + delay_));
    case MilestoneTime::IterationStart:
    case MilestoneTime::IterationEnd:
      // A transition has no iterations, so it never reaches a boundary.
      return 0;
  }
}

double TransitionPropertyProgressProvider::intervalStart() const {
  // A negative delay starts the transition partway through, and the web reports
  // that offset capped to the duration.
  return std::min(std::max(0.0, -delay_), duration_);
}

TransitionProgressState TransitionPropertyProgressProvider::getState() const {
  // rawProgress_ is empty until the property's delay has passed
  // (TimeProgressProvider::update resets it while timestamp < creationTimestamp + delay)
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

void TransitionProgressProvider::setMilestoneReporter(MilestoneReporter reporter) {
  reporter_ = std::move(reporter);

  for (const auto &[propertyName, propertyProgressProvider] : propertyProgressProviders_) {
    observeProperty(propertyName, *propertyProgressProvider);
  }
}

void TransitionProgressProvider::observeProperty(
    const std::string &propertyName,
    TransitionPropertyProgressProvider &provider) {
  if (!reporter_) {
    provider.setMilestoneReporter(nullptr);
    return;
  }

  // The lambda lives inside the provider, so capturing it by reference is safe.
  provider.setMilestoneReporter(
      [this, propertyName, &provider](const RunMilestone milestone, const MilestoneTime time) {
        reporter_(milestone, propertyName, provider.elapsedTimeAt(time));
      });
}

void TransitionProgressProvider::runProgressProvider(
    const std::string &propertyName,
    const bool isReversed,
    const double timestamp) {

  const auto settings = getPropertySettings(propertyName);

  const auto providerIt = propertyProgressProviders_.find(propertyName);
  std::shared_ptr<TransitionPropertyProgressProvider> provider;

  if (providerIt != propertyProgressProviders_.end()) {
    const auto &progressProvider = providerIt->second;
    progressProvider->update(timestamp);

    if (isReversed && progressProvider->getState() != TransitionProgressState::Idle) {
      // Create reversing shortening progress provider for interrupted reversing transition
      provider = createReversingShorteningProgressProvider(timestamp, settings, *progressProvider);
    }

    progressProvider->abort(timestamp);
  }

  if (!provider) {
    // Create progress provider with the new settings
    provider = std::make_shared<TransitionPropertyProgressProvider>(
        timestamp, settings.duration, settings.delay, settings.easingConfig);
  }

  propertyProgressProviders_.insert_or_assign(propertyName, provider);
  observeProperty(propertyName, *provider);
}

void TransitionProgressProvider::removeProperties(
    const std::vector<std::string> &propertyNames,
    const double timestamp) {
  for (const auto &propertyName : propertyNames) {
    removeProperty(propertyName, timestamp);
  }
}

void TransitionProgressProvider::removeProperty(const std::string &propertyName, const double timestamp) {
  const auto it = propertyProgressProviders_.find(propertyName);
  if (it == propertyProgressProviders_.end()) {
    return;
  }
  it->second->abort(timestamp);
  propertyProgressProviders_.erase(it);
}

void TransitionProgressProvider::abort(const double timestamp) {
  for (const auto &[_, provider] : propertyProgressProviders_) {
    provider->abort(timestamp);
  }
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
  const auto it = propertySettings_.find(propertyName);
  if (it == propertySettings_.end()) {
    // A pseudo toggle can run a property whose settings never parsed, e.g. a discrete
    // property without allowDiscrete.
    return CSSTransitionPropertySettings{};
  }
  return it->second;
}

} // namespace reanimated::css
