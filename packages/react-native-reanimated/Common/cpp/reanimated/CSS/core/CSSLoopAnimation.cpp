#include <reanimated/CSS/core/CSSLoopAnimation.h>

namespace reanimated::css {

namespace {
std::shared_ptr<KeyframeEasingFunctions> createKeyframeEasingFunctions(
    const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs) {
  auto keyframeEasingFunctions = std::make_shared<KeyframeEasingFunctions>();
  if (!keyframeEasingConfigs) {
    return keyframeEasingFunctions;
  }

  keyframeEasingFunctions->reserve(keyframeEasingConfigs->size());
  for (const auto &[offset, easingConfig] : *keyframeEasingConfigs) {
    keyframeEasingFunctions->emplace(offset, getEasingFunctionFromConfig(easingConfig));
  }

  return keyframeEasingFunctions;
}
} // namespace

CSSLoopAnimation::CSSLoopAnimation(
    const std::shared_ptr<AnimationStyleInterpolator> &interpolator,
    const std::unordered_set<std::string> &allProperties,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::shared_ptr<CSSAnimationSettings> &settings,
    const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs,
    const double timestamp)
    : settings_(settings),
      shadowNode_(shadowNode),
      progressProvider_(std::make_shared<AnimationProgressProvider>(
          timestamp,
          settings->duration,
          settings->delay,
          settings->iterationCount,
          settings->direction,
          getEasingFunctionFromConfig(settings->easingConfig),
          createKeyframeEasingFunctions(keyframeEasingConfigs))),
      allProperties_(allProperties),
      interpolator_(interpolator) {
  if (settings->playState == AnimationPlayState::Paused) {
    progressProvider_->pause(timestamp);
  }
}

double CSSLoopAnimation::getStartTimestamp(const double timestamp) const {
  return progressProvider_->getStartTimestamp(timestamp);
}

AnimationProgressState CSSLoopAnimation::getState(const double timestamp) const {
  return progressProvider_->getState(timestamp);
}

bool CSSLoopAnimation::isReversed() const {
  const auto direction = progressProvider_->getDirection();
  return direction == AnimationDirection::Reverse || direction == AnimationDirection::AlternateReverse;
}

folly::dynamic CSSLoopAnimation::getCurrentInterpolationStyle() const {
  return interpolator_->interpolate(shadowNode_, progressProvider_, FALLBACK_INTERPOLATION_THRESHOLD);
}

folly::dynamic CSSLoopAnimation::getBackwardsFillStyle() const {
  return isReversed() ? interpolator_->getLastKeyframeValue() : interpolator_->getFirstKeyframeValue();
}

folly::dynamic CSSLoopAnimation::getResetStyle() const {
  return interpolator_->getResetStyle(shadowNode_);
}

void CSSLoopAnimation::setAnimatedProperties(const std::unordered_set<std::string> &loopDrivenProperties) {
  interpolator_->setActiveProperties(loopDrivenProperties);
}

void CSSLoopAnimation::updateSettings(const PartialCSSAnimationSettings &updatedSettings, const double timestamp) {
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
  if (updatedSettings.playState.has_value()) {
    if (updatedSettings.playState.value() == AnimationPlayState::Paused) {
      progressProvider_->pause(timestamp);
    } else {
      progressProvider_->play(timestamp);
    }
  }

  progressProvider_->update(timestamp);
}

folly::dynamic CSSLoopAnimation::update(const double timestamp) {
  if (getState(timestamp) == AnimationProgressState::Pending) {
    progressProvider_->play(timestamp);
  }

  progressProvider_->update(timestamp);

  if (getState(timestamp) == AnimationProgressState::Pending) {
    return settings_->hasBackwardsFillMode() ? getBackwardsFillStyle() : folly::dynamic();
  }

  return getCurrentInterpolationStyle();
}

} // namespace reanimated::css
