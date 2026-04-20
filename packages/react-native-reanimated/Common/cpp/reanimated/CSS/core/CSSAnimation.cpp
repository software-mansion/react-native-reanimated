#include <reanimated/CSS/core/CSSAnimation.h>

#include <memory>
#include <string>
#include <utility>

namespace reanimated::css {

CSSAnimation::CSSAnimation(
    const Tag viewTag,
    std::string animationName,
    const CSSKeyframesConfig &cssKeyframesConfig,
    const CSSAnimationSettings &settings,
    const std::shared_ptr<std::unordered_set<Tag>> &updatedViewTags,
    const std::shared_ptr<std::unordered_set<Tag>> &revertedTags,
    const std::shared_ptr<OperationsLoop> &loop,
    const double timestamp)
    : viewTag_(viewTag),
      name_(std::move(animationName)),
      fillMode_(settings.fillMode),
      updatedViewTags_(updatedViewTags),
      revertedTags_(revertedTags),
      loop_(loop),
      styleInterpolator_(cssKeyframesConfig.styleInterpolator),
      progressProvider_(std::make_shared<AnimationProgressProvider>(
          timestamp,
          settings.duration,
          settings.delay,
          settings.iterationCount,
          settings.direction,
          getEasingFunctionFromConfig(settings.easingConfig),
          cssKeyframesConfig.keyframeEasingFunctions)) {
  if (settings.playState == AnimationPlayState::Paused) {
    progressProvider_->pause(timestamp);
  }
}

bool CSSAnimation::update(const double timestamp) {
  progressProvider_->update(timestamp);
  updatedViewTags_->insert(viewTag_);

  if (progressProvider_->getState() == AnimationProgressState::Finished && !hasForwardsFillMode()) {
    revertedTags_->insert(viewTag_);
  }

  return progressProvider_->getState() == AnimationProgressState::Running;
}

const std::string &CSSAnimation::getName() const {
  return name_;
}

double CSSAnimation::getStartTimestamp(const double timestamp) const {
  return progressProvider_->getStartTimestamp(timestamp);
}

AnimationProgressState CSSAnimation::getState() const {
  return progressProvider_->getState();
}

bool CSSAnimation::isReversed() const {
  const auto direction = progressProvider_->getDirection();
  return direction == AnimationDirection::Reverse || direction == AnimationDirection::AlternateReverse;
}

bool CSSAnimation::hasForwardsFillMode() const {
  return fillMode_ == AnimationFillMode::Forwards || fillMode_ == AnimationFillMode::Both;
}

bool CSSAnimation::hasBackwardsFillMode() const {
  return fillMode_ == AnimationFillMode::Backwards || fillMode_ == AnimationFillMode::Both;
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

void CSSAnimation::schedule() {
  if (progressProvider_->getState() != AnimationProgressState::Paused) {
    const auto timestamp = loop_->resolveTimestamp();
    loop_->schedule(shared_from_this(), progressProvider_->getStartTimestamp(timestamp));
  }
}

void CSSAnimation::unschedule() {
  loop_->remove(shared_from_this());
}

void CSSAnimation::updateSettings(const PartialCSSAnimationSettings &updatedSettings, const double timestamp) {
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
