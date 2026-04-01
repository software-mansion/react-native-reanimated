#include <reanimated/CSS/core/CSSAnimation.h>

#include <reanimated/CSS/progress/AnimationProgressProvider.h>

#include <utility>

namespace reanimated::css {

CSSAnimation::CSSAnimation(
    std::string name,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const CSSKeyframesConfig &keyframesConfig,
    const CSSAnimationSettings &settings,
    double timestamp)
    : name_(std::move(name)), settings_(settings), shadowNode_(shadowNode) {
  if (keyframesConfig.styleInterpolator) {
    loopAnimation_ = std::make_shared<CSSLoopAnimation>(
        shadowNode,
        keyframesConfig.styleInterpolator,
        std::make_shared<AnimationProgressProvider>(
            timestamp,
            settings.duration,
            settings.delay,
            settings.iterationCount,
            settings.direction,
            settings.easingConfig,
            keyframesConfig.keyframeEasingConfigs),
        settings.fillMode);

    if (settings.playState == AnimationPlayState::Paused) {
      loopAnimation_->pause(timestamp);
    }
  }

  if (!keyframesConfig.platformPropertyKeyframes.empty()) {
    platformAnimation_ = std::make_shared<CSSPlatformAnimation>(
        shadowNode->getTag(),
        name_,
        keyframesConfig.platformPropertyKeyframes,
        keyframesConfig.keyframeEasingConfigs,
        settings);
  }
}

const std::string &CSSAnimation::getName() const {
  return name_;
}

const CSSAnimationSettings &CSSAnimation::getSettings() const {
  return settings_;
}

std::shared_ptr<const ShadowNode> CSSAnimation::getShadowNode() const {
  return shadowNode_;
}

bool CSSAnimation::isPaused() const {
  return settings_.playState == AnimationPlayState::Paused;
}

bool CSSAnimation::hasLoopAnimation() const {
  return loopAnimation_ != nullptr;
}

const std::shared_ptr<CSSLoopAnimation> &CSSAnimation::getLoopAnimation() const {
  return loopAnimation_;
}

const std::shared_ptr<CSSPlatformAnimation> &CSSAnimation::getPlatformAnimation() const {
  return platformAnimation_;
}

void CSSAnimation::updateSettings(const PartialCSSAnimationSettings &updates, double timestamp) {
  if (updates.duration.has_value()) {
    settings_.duration = updates.duration.value();
  }
  if (updates.easingConfig.has_value()) {
    settings_.easingConfig = updates.easingConfig.value();
  }
  if (updates.delay.has_value()) {
    settings_.delay = updates.delay.value();
  }
  if (updates.iterationCount.has_value()) {
    settings_.iterationCount = updates.iterationCount.value();
  }
  if (updates.direction.has_value()) {
    settings_.direction = updates.direction.value();
  }
  if (updates.fillMode.has_value()) {
    settings_.fillMode = updates.fillMode.value();
  }
  if (updates.playState.has_value()) {
    settings_.playState = updates.playState.value();
  }

  if (loopAnimation_) {
    loopAnimation_->updateSettings(updates, timestamp);
  }
  if (platformAnimation_) {
    platformAnimation_->setSettings(settings_);
  }
}

} // namespace reanimated::css
