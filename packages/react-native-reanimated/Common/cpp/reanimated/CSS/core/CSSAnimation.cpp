#include <reanimated/CSS/core/CSSAnimation.h>

#include <memory>
#include <string>
#include <utility>

namespace reanimated::css {

CSSAnimation::CSSAnimation(
    std::shared_ptr<const ShadowNode> shadowNode,
    std::string animationName,
    const CSSKeyframesConfig &cssKeyframesConfig,
    const CSSAnimationSettings &settings,
    const double timestamp)
    : name_(std::move(animationName)),
      shadowNode_(std::move(shadowNode)),
      keyframesConfig_(cssKeyframesConfig),
      settings_(std::make_shared<CSSAnimationSettings>(settings)) {
  updatePropertyRouting(timestamp);
}

void CSSAnimation::onUpdate(const double timestamp) {
  if (loopAnimation_) {
    loopAnimation_->update(timestamp);
  }
}

bool CSSAnimation::isRunning() const {
  if (!loopAnimation_) {
    return false;
  }
  return loopAnimation_->getState() == AnimationProgressState::Running;
}

const std::string &CSSAnimation::getName() const {
  return name_;
}

double CSSAnimation::getStartTimestamp(const double timestamp) const {
  if (!loopAnimation_) {
    return timestamp;
  }
  return loopAnimation_->getStartTimestamp(timestamp);
}

double CSSAnimation::getRemainingDelay(const double timestamp) const {
  return getStartTimestamp(timestamp) - timestamp;
}

AnimationProgressState CSSAnimation::getState() const {
  if (!loopAnimation_) {
    return AnimationProgressState::Finished;
  }
  return loopAnimation_->getState();
}

bool CSSAnimation::hasForwardsFillMode() const {
  return settings_->hasForwardsFillMode();
}

bool CSSAnimation::hasBackwardsFillMode() const {
  return settings_->hasBackwardsFillMode();
}

bool CSSAnimation::hasLoopAnimation() const {
  return loopAnimation_ != nullptr;
}

std::shared_ptr<CSSLoopAnimation> CSSAnimation::getLoopAnimation() const {
  return loopAnimation_;
}

#ifdef __APPLE__
std::shared_ptr<CSSPlatformAnimation> CSSAnimation::getPlatformAnimation() const {
  return platformAnimation_;
}

bool CSSAnimation::hasPlatformAnimation() const {
  return platformAnimation_ != nullptr;
}
#endif

folly::dynamic CSSAnimation::getBackwardsFillStyle() const {
  if (!loopAnimation_) {
    return folly::dynamic::object();
  }
  return loopAnimation_->getBackwardsFillStyle();
}

folly::dynamic CSSAnimation::getCurrentInterpolationStyle(
    const std::shared_ptr<const ShadowNode> & /*shadowNode*/) const {
  if (!loopAnimation_) {
    return folly::dynamic::object();
  }
  return loopAnimation_->getCurrentInterpolationStyle();
}

folly::dynamic CSSAnimation::getResetStyle(
    const std::shared_ptr<const ShadowNode> & /*shadowNode*/) const {
  if (!loopAnimation_) {
    return folly::dynamic::object();
  }
  return loopAnimation_->getResetStyle();
}

void CSSAnimation::updateSettings(const PartialCSSAnimationSettings &updatedSettings, const double timestamp) {
  if (updatedSettings.duration.has_value()) {
    settings_->duration = updatedSettings.duration.value();
  }
  if (updatedSettings.easingConfig.has_value()) {
    settings_->easingConfig = updatedSettings.easingConfig.value();
    updatePropertyRouting(timestamp);
  }
  if (updatedSettings.delay.has_value()) {
    settings_->delay = updatedSettings.delay.value();
  }
  if (updatedSettings.iterationCount.has_value()) {
    settings_->iterationCount = updatedSettings.iterationCount.value();
  }
  if (updatedSettings.direction.has_value()) {
    settings_->direction = updatedSettings.direction.value();
  }
  if (updatedSettings.fillMode.has_value()) {
    settings_->fillMode = updatedSettings.fillMode.value();
  }
  if (updatedSettings.playState.has_value()) {
    settings_->playState = updatedSettings.playState.value();
  }

  if (loopAnimation_) {
    loopAnimation_->updateSettings(updatedSettings, timestamp);
  }
}

void CSSAnimation::updatePropertyRouting(const double timestamp) {
  const auto &allProperties = keyframesConfig_.styleInterpolatorFactory->getAllPropertyNames();

#ifdef __APPLE__
  const auto routing = apple::routeProperties(
      allProperties,
      keyframesConfig_.platformSupportedProperties,
      settings_->easingConfig,
      keyframesConfig_.keyframeEasingConfigs);

  if (!routing.platformProperties) {
    platformAnimation_.reset();
  } else if (!platformAnimation_) {
    platformAnimation_ = CSSPlatformAnimation::create(std::move(routing.platformProperties));
  } else {
    platformAnimation_->update(std::move(routing.platformProperties));
  }

  const auto &loopProperties = routing.loopProperties;
#else
  const auto &loopProperties = allProperties;
#endif

  if (loopProperties.empty()) {
    loopAnimation_.reset();
    return;
  }

  if (!loopAnimation_) {
    loopAnimation_ = std::make_shared<CSSLoopAnimation>(
        keyframesConfig_.styleInterpolatorFactory->create(loopProperties),
        allProperties,
        shadowNode_,
        settings_,
        keyframesConfig_.keyframeEasingConfigs,
        timestamp);
    return;
  }

  loopAnimation_->setAnimatedProperties(loopProperties);
}

} // namespace reanimated::css
