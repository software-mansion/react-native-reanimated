#include <reanimated/CSS/core/CSSAnimation.h>

namespace reanimated::css {

CSSAnimation::CSSAnimation(
    const CSSAnimationConfig &config,
    const double timestamp)
    : tag_(config.tag), fillMode_(config.fillMode) {
  progressProvider_ = std::make_shared<AnimationProgressProvider>(
      timestamp,
      config.duration,
      config.delay,
      config.iterationCount,
      config.direction,
      config.easing,
      config.keyframeEasings);

  styleInterpolator_ = config.styleInterpolator;

  if (config.playState == AnimationPlayState::Paused) {
    progressProvider_->pause(timestamp);
  }
}

const AnimationTag &CSSAnimation::getTag() const {
  return tag_;
}

double CSSAnimation::getStartTimestamp(const double timestamp) const {
  return progressProvider_->getStartTimestamp(timestamp);
}

AnimationProgressState CSSAnimation::getState() const {
  return progressProvider_->getState();
}

bool CSSAnimation::isReversed() const {
  const auto direction = progressProvider_->getDirection();
  return direction == AnimationDirection::Reverse ||
      direction == AnimationDirection::AlternateReverse;
}

bool CSSAnimation::hasForwardsFillMode() const {
  return fillMode_ == AnimationFillMode::Forwards ||
      fillMode_ == AnimationFillMode::Both;
}

bool CSSAnimation::hasBackwardsFillMode() const {
  return fillMode_ == AnimationFillMode::Backwards ||
      fillMode_ == AnimationFillMode::Both;
}

folly::dynamic CSSAnimation::getBackwardsFillStyle() const {
  return isReversed() ? styleInterpolator_->getLastKeyframeValue()
                      : styleInterpolator_->getFirstKeyframeValue();
}

folly::dynamic CSSAnimation::getResetStyle(
    const ShadowNode::Shared &shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const {
  return styleInterpolator_->getResetStyle(
      getUpdateContext(shadowNode, viewStylesRepository));
}

folly::dynamic CSSAnimation::getCurrentFrameProps(
    const ShadowNode::Shared &shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const {
  // Check if the animation has not started yet because of the delay
  // (In general, it shouldn't be activated until the delay has passed but we
  // add this check to make sure that animation doesn't start with the negative
  // progress)
  if (progressProvider_->getState() == AnimationProgressState::Pending) {
    return hasBackwardsFillMode() ? getBackwardsFillStyle() : folly::dynamic();
  }

  return styleInterpolator_->interpolate(
      getUpdateContext(shadowNode, viewStylesRepository));
}

void CSSAnimation::run(const double timestamp) {
  if (progressProvider_->getState() == AnimationProgressState::Finished) {
    return;
  }
  progressProvider_->play(timestamp);
}

void CSSAnimation::update(const double timestamp) {
  progressProvider_->update(timestamp);
}

void CSSAnimation::updateSettings(
    const PartialCSSAnimationSettings &updatedSettings,
    const double timestamp) {
  progressProvider_->resetProgress();

  if (updatedSettings.duration.has_value()) {
    progressProvider_->setDuration(updatedSettings.duration.value());
  }
  if (updatedSettings.easing.has_value()) {
    progressProvider_->setEasing(updatedSettings.easing.value());
  }
  if (updatedSettings.delay.has_value()) {
    progressProvider_->setDelay(updatedSettings.delay.value());
  }
  if (updatedSettings.iterationCount.has_value()) {
    progressProvider_->setIterationCount(
        updatedSettings.iterationCount.value());
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

bool CSSAnimation::updateSettings(
    const CSSAnimationSettings &settings,
    const double timestamp) {
  // TODO - improve
  const auto oldState = progressProvider_->getState();

  progressProvider_->setDuration(settings.duration);
  progressProvider_->setEasing(settings.easing);
  progressProvider_->setDelay(settings.delay);
  progressProvider_->setIterationCount(settings.iterationCount);
  progressProvider_->setDirection(settings.direction);
  fillMode_ = settings.fillMode;
  if (settings.playState == AnimationPlayState::Paused) {
    if (progressProvider_->getState() != AnimationProgressState::Paused) {
      progressProvider_->pause(timestamp);
    }
  } else {
    progressProvider_->play(timestamp);
  }

  progressProvider_->update(timestamp);

  // Return true if the animation progress state has changed after the settings
  // update
  return oldState != progressProvider_->getState();
}

PropertyInterpolatorUpdateContext CSSAnimation::getUpdateContext(
    const ShadowNode::Shared &shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const {
  return PropertyInterpolatorUpdateContext{
      .node = shadowNode,
      .progressProvider = progressProvider_,
      .viewStylesRepository = viewStylesRepository,
  };
}

} // namespace reanimated::css
