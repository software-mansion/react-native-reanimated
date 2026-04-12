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
    const std::shared_ptr<std::unordered_set<Tag>> &updatedViewTags,
    const std::shared_ptr<std::unordered_set<Tag>> &revertedTags,
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
      interpolator_(interpolator),
      updatedViewTags_(updatedViewTags),
      revertedTags_(revertedTags) {
  if (settings->playState == AnimationPlayState::Paused) {
    progressProvider_->pause(timestamp);
  }
}

double CSSLoopAnimation::getStartTimestamp(const double timestamp) const {
  return progressProvider_->getStartTimestamp(timestamp);
}

AnimationProgressState CSSLoopAnimation::getState() const {
  return progressProvider_->getState();
}

folly::dynamic CSSLoopAnimation::getCurrentInterpolationStyle() const {
  return interpolator_->interpolate(shadowNode_, progressProvider_, 0.5);
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

void CSSLoopAnimation::onUpdate(const double timestamp) {
  progressProvider_->update(timestamp);

  const auto viewTag = shadowNode_->getTag();
  updatedViewTags_->insert(viewTag);

  if (getState() == AnimationProgressState::Finished && !settings_->hasForwardsFillMode()) {
    revertedTags_->insert(viewTag);
  }
}

bool CSSLoopAnimation::isRunning() const {
  return getState() == AnimationProgressState::Running;
}

double CSSLoopAnimation::getRemainingDelay(const double timestamp) const {
  return getStartTimestamp(timestamp) - timestamp;
}

} // namespace reanimated::css
