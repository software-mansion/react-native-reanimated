#include <reanimated/CSS/core/CSSAnimation.h>

#include <memory>
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
    const std::shared_ptr<CSSPlatformAnimationFactory> &platformAnimationFactory,
    const double timestamp)
    : viewTag_(viewTag),
      name_(std::move(animationName)),
      keyframesConfig_(cssKeyframesConfig),
      settings_(std::make_shared<CSSAnimationSettings>(settings)),
      loop_(loop),
      styleInterpolator_(cssKeyframesConfig.styleInterpolatorFactory->create()),
      loopAnimation_(std::make_shared<CSSLoopAnimation>(
          viewTag,
          styleInterpolator_,
          settings_,
          cssKeyframesConfig.keyframeEasingConfigs,
          updatedViewTags,
          revertedTags,
          loop,
          timestamp)),
      platformAnimationFactory_(platformAnimationFactory) {
  updatePropertyRouting();
}

const std::string &CSSAnimation::getName() const {
  return name_;
}

AnimationProgressState CSSAnimation::getState() const {
  return loopAnimation_->getState();
}

bool CSSAnimation::hasForwardsFillMode() const {
  return settings_->hasForwardsFillMode();
}

bool CSSAnimation::hasBackwardsFillMode() const {
  return settings_->hasBackwardsFillMode();
}

folly::dynamic CSSAnimation::getBackwardsFillStyle() const {
  return isReversed() ? styleInterpolator_->getLastKeyframeValue() : styleInterpolator_->getFirstKeyframeValue();
}

folly::dynamic CSSAnimation::getCurrentInterpolationStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const {
  return loopAnimation_->getCurrentInterpolationStyle(shadowNode);
}

folly::dynamic CSSAnimation::getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const {
  return keyframesConfig_.styleInterpolatorFactory->getResetStyle(shadowNode);
}

void CSSAnimation::schedule() {
  loopAnimation_->schedule();
  if (platformAnimation_) {
    const auto startTimestamp = loop_->getTimestamp() + settings_->delay;
    platformAnimation_->schedule(startTimestamp);
  }
}

void CSSAnimation::unschedule() {
  loopAnimation_->unschedule();
  if (platformAnimation_) {
    platformAnimation_->unschedule();
  }
}

void CSSAnimation::updateSettings(const PartialCSSAnimationSettings &updatedSettings, const double timestamp) {
  loopAnimation_->updateSettings(updatedSettings, timestamp);
}

bool CSSAnimation::isReversed() const {
  return settings_->direction == AnimationDirection::Reverse ||
      settings_->direction == AnimationDirection::AlternateReverse;
}

void CSSAnimation::updatePropertyRouting() {
  if (!platformAnimationFactory_) {
    return;
  }
  const auto &allProperties = keyframesConfig_.styleInterpolatorFactory->getAllPropertyNames();
  auto result = platformAnimationFactory_->resolve(viewTag_, name_, allProperties, keyframesConfig_, settings_);
  platformAnimation_ = result.animation;
  loopAnimation_->setAnimatedProperties(result.remainingProperties);
}

} // namespace reanimated::css
