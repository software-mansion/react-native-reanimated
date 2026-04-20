#include <reanimated/CSS/core/CSSLoopAnimation.h>

#include <memory>

namespace reanimated::css {

CSSLoopAnimation::CSSLoopAnimation(
    const Tag viewTag,
    const std::shared_ptr<AnimationStyleInterpolator> &interpolator,
    const std::shared_ptr<CSSAnimationSettings> &settings,
    const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs,
    const std::shared_ptr<std::unordered_set<Tag>> &updatedViewTags,
    const std::shared_ptr<std::unordered_set<Tag>> &revertedTags,
    const std::shared_ptr<OperationsLoop> &loop,
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
      updatedViewTags_(updatedViewTags),
      revertedTags_(revertedTags),
      loop_(loop) {
  if (settings->playState == AnimationPlayState::Paused) {
    progressProvider_->pause(timestamp);
  }
}

void CSSLoopAnimation::onUpdate(const double timestamp) {
  progressProvider_->update(timestamp);
  updatedViewTags_->insert(viewTag_);

  if (progressProvider_->getState() == AnimationProgressState::Finished && !settings_->hasForwardsFillMode()) {
    revertedTags_->insert(viewTag_);
  }
}

bool CSSLoopAnimation::isRunning() const {
  return progressProvider_->getState() == AnimationProgressState::Running;
}

AnimationProgressState CSSLoopAnimation::getState() const {
  return progressProvider_->getState();
}

folly::dynamic CSSLoopAnimation::getCurrentInterpolationStyle(
    const std::shared_ptr<const ShadowNode> &shadowNode) const {
  return interpolator_->interpolate(shadowNode, progressProvider_, FALLBACK_INTERPOLATION_THRESHOLD);
}

void CSSLoopAnimation::schedule() {
  if (progressProvider_->getState() != AnimationProgressState::Paused) {
    const auto timestamp = loop_->getTimestamp();
    loop_->schedule(shared_from_this(), progressProvider_->getStartTimestamp(timestamp));
  }
}

void CSSLoopAnimation::unschedule() {
  loop_->remove(shared_from_this());
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
