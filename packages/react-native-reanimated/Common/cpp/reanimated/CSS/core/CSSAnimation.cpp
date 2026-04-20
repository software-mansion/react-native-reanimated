#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <memory>
#include <string>
#include <utility>

namespace reanimated::css {

CSSAnimation::CSSAnimation(
    const Tag viewTag,
    std::string animationName,
    const CSSKeyframesConfig &cssKeyframesConfig,
    const CSSAnimationSettings &settings,
    Observer &observer,
    const double timestamp)
    : viewTag_(viewTag),
      name_(std::move(animationName)),
      fillMode_(settings.fillMode),
      observer_(observer),
      styleInterpolator_(cssKeyframesConfig.styleInterpolatorFactory->create()),
      progressProvider_(std::make_shared<AnimationProgressProvider>(
          timestamp,
          settings.duration,
          settings.delay,
          settings.iterationCount,
          settings.direction,
          getEasingFunctionFromConfig(settings.easingConfig),
          cssKeyframesConfig.keyframeEasingConfigs)) {
  if (settings.playState == AnimationPlayState::Paused) {
    progressProvider_->pause(timestamp);
  }
}

bool CSSAnimation::isReversed() const {
  const auto direction = progressProvider_->getDirection();
  return direction == AnimationDirection::Reverse || direction == AnimationDirection::AlternateReverse;
}

folly::dynamic CSSAnimation::getBackwardsFillStyle() const {
  return isReversed() ? styleInterpolator_->getLastKeyframeValue() : styleInterpolator_->getFirstKeyframeValue();
}

folly::dynamic CSSAnimation::getCurrentInterpolationStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const {
  return styleInterpolator_->interpolate(shadowNode, progressProvider_, FALLBACK_INTERPOLATION_THRESHOLD);
}

folly::dynamic CSSAnimation::getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const {
  return styleInterpolator_->getResetStyle(shadowNode);
}

bool CSSAnimation::update(const double timestamp, OperationsLoop & /*loop*/) {
  progressProvider_->update(timestamp);
  observer_.onAnimationUpdate(viewTag_);

  if (progressProvider_->getState() == AnimationProgressState::Finished && !hasForwardsFillMode()) {
    observer_.onAnimationNeedsRevert(viewTag_);
  }

  return progressProvider_->getState() == AnimationProgressState::Running;
}

void CSSAnimation::schedule(OperationsLoop &loop) {
  if (progressProvider_->getState() != AnimationProgressState::Paused) {
    const auto timestamp = loop.resolveTimestamp();
    loop.schedule(shared_from_this(), progressProvider_->getStartTimestamp(timestamp));
  }
}

void CSSAnimation::unschedule(OperationsLoop &loop) {
  loop.remove(shared_from_this());
}

void CSSAnimation::updateConfig(const PartialCSSAnimationSettings &updatedSettings, const double timestamp) {
  progressProvider_->resetProgress();

  if (updatedSettings.duration.has_value()) {
    progressProvider_->setDuration(updatedSettings.duration.value());
  }
  if (updatedSettings.easingConfig.has_value()) {
    progressProvider_->setEasingFunction(getEasingFunctionFromConfig(updatedSettings.easingConfig.value()));
  }
  if (updatedSettings.delay.has_value()) {
    progressProvider_->setDelay(updatedSettings.delay.value());
  }
  if (updatedSettings.iterationCount.has_value()) {
    progressProvider_->setIterationCount(updatedSettings.iterationCount.value());
  }
  if (updatedSettings.direction.has_value()) {
    progressProvider_->setDirection(updatedSettings.direction.value());
  }
  if (updatedSettings.fillMode.has_value()) {
    fillMode_ = updatedSettings.fillMode.value();
  }
  if (updatedSettings.playState.has_value()) {
    if (updatedSettings.playState.value() == AnimationPlayState::Paused) {
      progressProvider_->pause(timestamp);
    } else {
      progressProvider_->play(timestamp);
    }
  }

  progressProvider_->update(timestamp);
}

} // namespace reanimated::css
