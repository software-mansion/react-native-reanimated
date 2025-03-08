#include <reanimated/CSS/core/CSSAnimation.h>

namespace reanimated::css {

CSSAnimation::CSSAnimation(
    jsi::Runtime &rt,
    ShadowNode::Shared shadowNode,
    std::string name,
    const CSSKeyframesConfig &keyframesConfig,
    const AnimationFillMode fillMode,
    const double timestamp)
    : name_(std::move(name)),
      shadowNode_(std::move(shadowNode)),
      fillMode_(fillMode),
      styleInterpolator_(keyframesConfig.styleInterpolator) {}

const std::string &CSSAnimation::getName() const {
  return name_;
}

ShadowNode::Shared CSSAnimation::getShadowNode() const {
  return shadowNode_;
}

bool CSSAnimation::hasForwardsFillMode() const {
  return fillMode_ == AnimationFillMode::Forwards ||
      fillMode_ == AnimationFillMode::Both;
}

bool CSSAnimation::hasBackwardsFillMode() const {
  return fillMode_ == AnimationFillMode::Backwards ||
      fillMode_ == AnimationFillMode::Both;
}

folly::dynamic CSSAnimation::getBackwardsFillStyle(
    const ProgressProvider &progressProvider) const {
  return progressProvider->isReversed()
      ? styleInterpolator_->getLastKeyframeValue()
      : styleInterpolator_->getFirstKeyframeValue();
}

folly::dynamic CSSAnimation::getForwardsFillStyle(
    const ProgressProvider &progressProvider) const {
  return progressProvider->isReversed()
      ? styleInterpolator_->getFirstKeyframeValue()
      : styleInterpolator_->getLastKeyframeValue();
}

folly::dynamic CSSAnimation::getResetStyle() const {
  return styleInterpolator_->getResetStyle(shadowNode_);
}

void CSSAnimation::setFillMode(const AnimationFillMode fillMode) {
  fillMode_ = fillMode;
}

folly::dynamic CSSAnimation::interpolate(
    const ProgressProvider &progressProvider) const {
  return styleInterpolator_->interpolate(shadowNode_, progressProvider);
}

} // namespace reanimated::css
