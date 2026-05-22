#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/CSS/core/CSSLoopAnimation.h>

#include <memory>
#include <utility>

namespace reanimated::css {

CSSAnimation::CSSAnimation(
    const Tag viewTag,
    std::string animationName,
    const CSSKeyframesConfig &cssKeyframesConfig,
    const CSSAnimationSettings &settings,
    Observer &observer,
    const double timestamp)
    : name_(std::move(animationName)),
      settings_(std::make_shared<CSSAnimationSettings>(settings)),
      styleInterpolator_(cssKeyframesConfig.styleInterpolatorFactory->create()),
      loopAnimation_(std::make_shared<CSSLoopAnimation>(
          viewTag,
          styleInterpolator_,
          settings_,
          cssKeyframesConfig.keyframeEasingConfigs,
          observer,
          timestamp)) {}

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
  return styleInterpolator_->getResetStyle(shadowNode);
}

void CSSAnimation::schedule(OperationsLoop &loop) {
  loopAnimation_->schedule(loop);
}

void CSSAnimation::unschedule(OperationsLoop &loop) {
  loopAnimation_->unschedule(loop);
}

void CSSAnimation::updateSettings(const PartialCSSAnimationSettings &updatedSettings, const double timestamp) {
  loopAnimation_->updateSettings(updatedSettings, timestamp);
}

bool CSSAnimation::isReversed() const {
  return settings_->direction == AnimationDirection::Reverse ||
      settings_->direction == AnimationDirection::AlternateReverse;
}

} // namespace reanimated::css
