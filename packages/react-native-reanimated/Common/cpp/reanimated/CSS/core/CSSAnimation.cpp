#include <reanimated/CSS/core/CSSAnimation.h>

namespace reanimated::css {

CSSAnimation::CSSAnimation(
    std::string name,
    ShadowNode::Shared shadowNode,
    const AnimationFillMode fillMode,
    const std::shared_ptr<AnimationStyleInterpolator> &styleInterpolator,
    const std::shared_ptr<AnimationProgressProviderBase> &progressProvider)
    : name_(std::move(name)),
      shadowNode_(std::move(shadowNode)),
      fillMode_(fillMode),
      styleInterpolator_(styleInterpolator),
      progressProvider_(progressProvider) {}

const std::string &CSSAnimation::getName() const {
  return name_;
}

ShadowNode::Shared CSSAnimation::getShadowNode() const {
  return shadowNode_;
}

std::shared_ptr<AnimationProgressProviderBase>
CSSAnimation::getProgressProvider() const {
  return progressProvider_;
}

bool CSSAnimation::isReversed() const {
  return progressProvider_->isReversed();
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

folly::dynamic CSSAnimation::getForwardsFillStyle() const {
  return isReversed() ? styleInterpolator_->getFirstKeyframeValue()
                      : styleInterpolator_->getLastKeyframeValue();
}

folly::dynamic CSSAnimation::getResetStyle() const {
  return styleInterpolator_->getResetStyle(shadowNode_);
}

void CSSAnimation::setFillMode(const AnimationFillMode fillMode) {
  fillMode_ = fillMode;
}

void CSSAnimation::setProgressProvider(
    const std::shared_ptr<AnimationProgressProviderBase> &progressProvider) {
  progressProvider_ = progressProvider;
}

folly::dynamic CSSAnimation::getCurrentFrame() const {
  return styleInterpolator_->interpolate(shadowNode_, progressProvider_);
}

} // namespace reanimated::css
