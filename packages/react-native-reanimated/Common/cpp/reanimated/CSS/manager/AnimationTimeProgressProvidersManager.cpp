#include <reanimated/CSS/manager/AnimationTimeProgressProvidersManager.h>

namespace reanimated::css {

bool AnimationTimeProgressProvidersManager::empty() const {
  return runningProgressProviders_.empty() &&
      recentlyUpdatedProgressProviders_.empty() &&
      delayedProgressProvidersManager_.empty();
}

void AnimationTimeProgressProvidersManager::run(
    const ProviderShared &progressProvider,
    const double timestamp) {
  // Remove progress provider in order to properly re-add it later
  // (e.g. in case the running progress provider becomes delayed, etc.)
  erase(progressProvider);

  const auto startTimestamp = progressProvider->getStartTimestamp(timestamp);

  if (startTimestamp > timestamp) {
    // If the progress provider is delayed, schedule it for activation
    if (progressProvider->getState(timestamp) !=
        AnimationProgressState::Paused) {
      delayedProgressProvidersManager_.add(startTimestamp, progressProvider);
    }
  } else {
    // Otherwise, add it to the running progress providers right away
    runningProgressProviders_.insert(progressProvider);
  }
}

void AnimationTimeProgressProvidersManager::updateAndRun(
    const ProviderShared &progressProvider,
    const PartialCSSAnimationSettings &settings,
    const double timestamp) {
  if (settings.duration.has_value()) {
    progressProvider->setDuration(settings.duration.value());
  }
  if (settings.easingFunction.has_value()) {
    progressProvider->setEasingFunction(settings.easingFunction.value());
  }
  if (settings.delay.has_value()) {
    progressProvider->setDelay(settings.delay.value());
  }
  if (settings.iterationCount.has_value()) {
    progressProvider->setIterationCount(settings.iterationCount.value());
  }
  if (settings.direction.has_value()) {
    progressProvider->setDirection(settings.direction.value());
  }
  if (settings.playState.has_value()) {
    if (settings.playState.value() == AnimationPlayState::Paused) {
      progressProvider->pause(timestamp);
    } else {
      progressProvider->play(timestamp);
    }
  }

  run(progressProvider, timestamp);
}

void AnimationTimeProgressProvidersManager::erase(
    const ProviderShared &progressProvider) {
  runningProgressProviders_.erase(progressProvider);
  delayedProgressProvidersManager_.erase(progressProvider);
}

void AnimationTimeProgressProvidersManager::update(const double timestamp) {
  // Activate all delayed progress providers that should start now
  activateDelayedProviders(timestamp);

  // Iterate over active progress providers and update them
  for (const auto &progressProvider : runningProgressProviders_) {
    progressProvider->update(timestamp);
    recentlyUpdatedProgressProviders_.insert(progressProvider);

    if (progressProvider->getState(timestamp) !=
        AnimationProgressState::Running) {
      runningProgressProviders_.erase(progressProvider);
    }
  }
}

void AnimationTimeProgressProvidersManager::activateDelayedProviders(
    const double timestamp) {
  while (!delayedProgressProvidersManager_.empty() &&
         delayedProgressProvidersManager_.top().timestamp <= timestamp) {
    const auto &delayedItem = delayedProgressProvidersManager_.pop();
    runningProgressProviders_.insert(delayedItem.value);
  }
}

} // namespace reanimated::css
