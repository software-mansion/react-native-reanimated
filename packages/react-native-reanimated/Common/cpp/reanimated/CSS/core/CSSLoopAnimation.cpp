#include <reanimated/CSS/core/CSSLoopAnimation.h>

#include <memory>
#include <string>

namespace reanimated::css {

CSSLoopAnimation::CSSLoopAnimation(
    const Tag viewTag,
    const std::shared_ptr<AnimationStyleInterpolator> &interpolator,
    const std::shared_ptr<CSSAnimationSettings> &settings,
    const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs,
    CSSAnimationObserver &observer,
    const double timestamp)
    : viewTag_(viewTag),
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
      observer_(observer) {
  if (settings->playState == AnimationPlayState::Paused) {
    progressProvider_->pause(timestamp);
  }
}

void CSSLoopAnimation::setMilestoneReporter(MilestoneReporter reporter) {
  if (!reporter) {
    progressProvider_->setMilestoneReporter(nullptr);
    return;
  }
  // The provider is a member, so capturing `this` cannot outlive it.
  progressProvider_->setMilestoneReporter(
      [this, reporter = std::move(reporter)](const RunMilestone milestone, const MilestoneTime time) {
        reporter(milestone, progressProvider_->elapsedTimeAt(time));
      });
}

void CSSLoopAnimation::abort(const double timestamp) {
  progressProvider_->abort(timestamp);
}

folly::dynamic CSSLoopAnimation::getCurrentInterpolationStyle(
    const std::shared_ptr<const ShadowNode> &shadowNode) const {
  return interpolator_->interpolate(shadowNode, progressProvider_, FALLBACK_INTERPOLATION_THRESHOLD);
}

bool CSSLoopAnimation::update(const double timestamp, OperationsLoop & /*loop*/) {
  progressProvider_->update(timestamp);
  observer_.onAnimationUpdate(viewTag_);

  if (progressProvider_->getState() == AnimationProgressState::Finished && !settings_->hasForwardsFillMode()) {
    observer_.onAnimationNeedsRevert(viewTag_);
  }

  return progressProvider_->getState() == AnimationProgressState::Running;
}

void CSSLoopAnimation::schedule(OperationsLoop &loop) {
  const auto timestamp = loop.resolveTimestamp();

  // A paused run is never ticked, but the web still reports one whose delay has
  // already elapsed as started, so position its lifecycle once instead.
  if (progressProvider_->getState() == AnimationProgressState::Paused) {
    progressProvider_->update(timestamp);
    return;
  }

  loop.schedule(shared_from_this(), progressProvider_->getStartTimestamp(timestamp));
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
}

} // namespace reanimated::css
