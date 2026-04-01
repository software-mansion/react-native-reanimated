#include <reanimated/CSS/core/CSSLoopAnimation.h>

#include <utility>

namespace reanimated::css {

CSSLoopAnimation::CSSLoopAnimation(
    std::shared_ptr<const ShadowNode> shadowNode,
    std::shared_ptr<AnimationStyleInterpolator> styleInterpolator,
    std::shared_ptr<AnimationProgressProvider> progressProvider,
    AnimationFillMode fillMode)
    : shadowNode_(std::move(shadowNode)),
      styleInterpolator_(std::move(styleInterpolator)),
      progressProvider_(std::move(progressProvider)),
      fillMode_(fillMode) {}

std::shared_ptr<const ShadowNode> CSSLoopAnimation::getShadowNode() const {
  return shadowNode_;
}

AnimationProgressState CSSLoopAnimation::getState(double timestamp) const {
  return progressProvider_->getState(timestamp);
}

double CSSLoopAnimation::getStartTimestamp(double timestamp) const {
  return progressProvider_->getStartTimestamp(timestamp);
}

bool CSSLoopAnimation::isReversed() const {
  const auto direction = progressProvider_->getDirection();
  return direction == AnimationDirection::Reverse ||
      direction == AnimationDirection::AlternateReverse;
}

bool CSSLoopAnimation::hasForwardsFillMode() const {
  return fillMode_ == AnimationFillMode::Forwards ||
      fillMode_ == AnimationFillMode::Both;
}

bool CSSLoopAnimation::hasBackwardsFillMode() const {
  return fillMode_ == AnimationFillMode::Backwards ||
      fillMode_ == AnimationFillMode::Both;
}

folly::dynamic CSSLoopAnimation::getCurrentInterpolationStyle() const {
  return styleInterpolator_->interpolate(
      shadowNode_, progressProvider_, FALLBACK_INTERPOLATION_THRESHOLD);
}

folly::dynamic CSSLoopAnimation::getBackwardsFillStyle() const {
  return isReversed() ? styleInterpolator_->getLastKeyframeValue()
                      : styleInterpolator_->getFirstKeyframeValue();
}

folly::dynamic CSSLoopAnimation::getResetStyle() const {
  return styleInterpolator_->getResetStyle(shadowNode_);
}

void CSSLoopAnimation::run(double timestamp) {
  if (progressProvider_->getState(timestamp) ==
      AnimationProgressState::Finished) {
    return;
  }
  progressProvider_->play(timestamp);
}

folly::dynamic CSSLoopAnimation::update(double timestamp) {
  progressProvider_->update(timestamp);

  if (progressProvider_->getState(timestamp) ==
      AnimationProgressState::Pending) {
    return hasBackwardsFillMode() ? getBackwardsFillStyle() : folly::dynamic();
  }

  return styleInterpolator_->interpolate(
      shadowNode_, progressProvider_, FALLBACK_INTERPOLATION_THRESHOLD);
}

void CSSLoopAnimation::pause(double timestamp) {
  progressProvider_->pause(timestamp);
}

void CSSLoopAnimation::play(double timestamp) {
  progressProvider_->play(timestamp);
}

void CSSLoopAnimation::updateSettings(
    const PartialCSSAnimationSettings &settings,
    double timestamp) {
  progressProvider_->resetProgress();

  if (settings.duration.has_value()) {
    progressProvider_->setDuration(settings.duration.value());
  }
  if (settings.easingConfig.has_value()) {
    progressProvider_->setEasing(settings.easingConfig.value());
  }
  if (settings.delay.has_value()) {
    progressProvider_->setDelay(settings.delay.value());
  }
  if (settings.iterationCount.has_value()) {
    progressProvider_->setIterationCount(settings.iterationCount.value());
  }
  if (settings.direction.has_value()) {
    progressProvider_->setDirection(settings.direction.value());
  }
  if (settings.fillMode.has_value()) {
    fillMode_ = settings.fillMode.value();
  }
  if (settings.playState.has_value()) {
    if (settings.playState.value() == AnimationPlayState::Paused) {
      progressProvider_->pause(timestamp);
    } else {
      progressProvider_->play(timestamp);
    }
  }

  progressProvider_->update(timestamp);
}

} // namespace reanimated::css
