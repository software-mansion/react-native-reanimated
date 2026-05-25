#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/CSS/core/CSSLoopAnimation.h>
#include <reanimated/Tools/FeatureFlags.h>

#include <memory>
#include <utility>

namespace reanimated::css {

CSSAnimation::CSSAnimation(
    const Tag viewTag,
    std::string animationName,
    const CSSKeyframesConfig &cssKeyframesConfig,
    const CSSAnimationSettings &settings,
    Observer &observer,
    const std::shared_ptr<CSSPlatformAnimationFactory> &platformAnimationFactory,
    const double timestamp)
    : viewTag_(viewTag),
      name_(std::move(animationName)),
      keyframesConfig_(cssKeyframesConfig),
      settings_(std::make_shared<CSSAnimationSettings>(settings)),
      styleInterpolator_(cssKeyframesConfig.styleInterpolatorFactory->create()),
      loopAnimation_(std::make_shared<CSSLoopAnimation>(
          viewTag,
          styleInterpolator_,
          settings_,
          cssKeyframesConfig.keyframeEasingConfigs,
          observer,
          timestamp)),
      platformAnimationFactory_(platformAnimationFactory) {
  updatePropertyRouting();
}

AnimationProgressState CSSAnimation::getState() const {
  return loopAnimation_->getState();
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

void CSSAnimation::schedule(OperationsLoop &loop) {
  loopAnimation_->schedule(loop);
  if (platformAnimation_) {
    platformAnimation_->schedule(loop.resolveTimestamp() + settings_->delay);
  }
}

void CSSAnimation::unschedule(OperationsLoop &loop) {
  loopAnimation_->unschedule(loop);
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
  if constexpr (!StaticFeatureFlags::getFlag("IOS_CSS_CORE_ANIMATION")) {
    return;
  }
  const auto &allProperties = keyframesConfig_.styleInterpolatorFactory->getAllPropertyNames();
  auto result = platformAnimationFactory_->resolve(viewTag_, name_, allProperties, keyframesConfig_, settings_);
  platformAnimation_ = result.animation;
  loopAnimation_->setAnimatedProperties(result.remainingProperties);
}

} // namespace reanimated::css
