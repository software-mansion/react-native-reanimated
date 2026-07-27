#include <reanimated/CSS/core/CSSLoopAnimation.h>

#include <algorithm>
#include <memory>
#include <string>
#include <utility>

namespace reanimated::css {

CSSLoopAnimation::CSSLoopAnimation(
    const Tag viewTag,
    std::string animationName,
    const std::shared_ptr<AnimationStyleInterpolator> &interpolator,
    const std::shared_ptr<CSSAnimationSettings> &settings,
    const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs,
    CSSAnimation::Observer &observer,
    const double timestamp)
    : viewTag_(viewTag),
      animationName_(std::move(animationName)),
      settings_(settings),
      interpolator_(interpolator),
      progressProvider_(std::make_shared<AnimationProgressProvider>(
          timestamp,
          settings->duration,
          settings->delay,
          settings->iterationCount,
          settings->direction,
          getEasingFunctionFromConfig(settings->easingConfig),
          keyframeEasingConfigs)),
      observer_(observer),
      lastObservedState_(progressProvider_->getState()),
      lastObservedIteration_(progressProvider_->getCurrentIteration()) {
  if (settings->playState == AnimationPlayState::Paused) {
    progressProvider_->pause(timestamp);
  }
}

folly::dynamic CSSLoopAnimation::getCurrentInterpolationStyle(
    const std::shared_ptr<const ShadowNode> &shadowNode) const {
  return interpolator_->interpolate(shadowNode, progressProvider_, FALLBACK_INTERPOLATION_THRESHOLD);
}

bool CSSLoopAnimation::update(const double timestamp, OperationsLoop & /*loop*/) {
  progressProvider_->update(timestamp);
  reportProgressEvents(timestamp);
  observer_.onAnimationUpdate(viewTag_);

  if (progressProvider_->getState() == AnimationProgressState::Finished && !settings_->hasForwardsFillMode()) {
    observer_.onAnimationNeedsRevert(viewTag_);
  }

  return progressProvider_->getState() == AnimationProgressState::Running;
}

void CSSLoopAnimation::reportProgressEvents(const double timestamp) {
  const auto state = progressProvider_->getState();

  if (lastObservedState_ == AnimationProgressState::Pending && state != AnimationProgressState::Pending) {
    reportStart();
  }

  reportIterations(timestamp);

  if (lastObservedState_ != AnimationProgressState::Finished && state == AnimationProgressState::Finished) {
    reportEnd();
  }

  lastObservedState_ = state;
  lastObservedIteration_ = progressProvider_->getCurrentIteration();
}

void CSSLoopAnimation::reportStart() {
  // A negative delay starts the animation partway through, and the spec caps
  // the reported time at the animation's total active duration.
  const auto activeDuration = progressProvider_->getDuration() * progressProvider_->getIterationCount();
  const auto elapsedTime = std::clamp(-progressProvider_->getDelay(), 0.0, std::max(0.0, activeDuration));
  observer_.onAnimationEvent(viewTag_, animationName_, CSSEventType::AnimationStart, elapsedTime);
}

void CSSLoopAnimation::reportIterations(const double timestamp) {
  // The provider bumps the iteration counter before the final-frame clamp, so
  // without this guard a finishing animation reports one iteration too many.
  if (progressProvider_->shouldFinish(timestamp)) {
    return;
  }

  const auto currentIteration = progressProvider_->getCurrentIteration();
  const auto duration = progressProvider_->getDuration();

  // A dropped frame or a negative delay can cross several boundaries at once,
  // and each one is a separate event.
  for (auto iteration = lastObservedIteration_ + 1; iteration <= currentIteration; iteration++) {
    observer_.onAnimationEvent(viewTag_, animationName_, CSSEventType::AnimationIteration, (iteration - 1) * duration);
  }
}

void CSSLoopAnimation::reportEnd() {
  const auto elapsedTime = progressProvider_->getDuration() * progressProvider_->getIterationCount();
  observer_.onAnimationEvent(viewTag_, animationName_, CSSEventType::AnimationEnd, elapsedTime);
}

void CSSLoopAnimation::reportCancellation(const double timestamp) {
  if (lastObservedState_ == AnimationProgressState::Finished) {
    return;
  }
  observer_.onAnimationEvent(
      viewTag_, animationName_, CSSEventType::AnimationCancel, progressProvider_->getActiveElapsedTime(timestamp));
}

void CSSLoopAnimation::schedule(OperationsLoop &loop) {
  if (progressProvider_->getState() != AnimationProgressState::Paused) {
    const auto timestamp = loop.resolveTimestamp();
    loop.schedule(shared_from_this(), progressProvider_->getStartTimestamp(timestamp));
  }
}

void CSSLoopAnimation::unschedule(OperationsLoop &loop) {
  loop.remove(shared_from_this());
}

void CSSLoopAnimation::setAnimatedProperties(const std::unordered_set<std::string> &loopDrivenProperties) {
  interpolator_->setActiveProperties(loopDrivenProperties);
}

void CSSLoopAnimation::updateSettings(const PartialCSSAnimationSettings &updatedSettings, const double timestamp) {
  progressProvider_->resetProgress();

  if (updatedSettings.duration.has_value()) {
    settings_->duration = updatedSettings.duration.value();
    progressProvider_->setDuration(updatedSettings.duration.value());
  }
  if (updatedSettings.easingConfig.has_value()) {
    settings_->easingConfig = updatedSettings.easingConfig.value();
    progressProvider_->setEasingFunction(getEasingFunctionFromConfig(updatedSettings.easingConfig.value()));
  }
  if (updatedSettings.delay.has_value()) {
    settings_->delay = updatedSettings.delay.value();
    progressProvider_->setDelay(updatedSettings.delay.value());
  }
  if (updatedSettings.iterationCount.has_value()) {
    settings_->iterationCount = updatedSettings.iterationCount.value();
    progressProvider_->setIterationCount(updatedSettings.iterationCount.value());
  }
  if (updatedSettings.direction.has_value()) {
    settings_->direction = updatedSettings.direction.value();
    progressProvider_->setDirection(updatedSettings.direction.value());
  }
  if (updatedSettings.fillMode.has_value()) {
    settings_->fillMode = updatedSettings.fillMode.value();
  }
  if (updatedSettings.playState.has_value()) {
    settings_->playState = updatedSettings.playState.value();
    if (updatedSettings.playState.value() == AnimationPlayState::Paused) {
      progressProvider_->pause(timestamp);
    } else {
      progressProvider_->play(timestamp);
    }
  }

  progressProvider_->update(timestamp);
  // Diffing against the state captured before `resetProgress` keeps a settings
  // change from fabricating a restart while still reporting boundaries the new
  // settings genuinely crossed.
  reportProgressEvents(timestamp);
}

} // namespace reanimated::css
