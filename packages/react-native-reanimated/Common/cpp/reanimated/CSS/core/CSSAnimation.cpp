#include <reanimated/CSS/core/CSSAnimation.h>

namespace reanimated::css {

CSSAnimation::CSSAnimation(
    std::string name,
    ShadowNode::Shared shadowNode,
    const std::shared_ptr<AnimationStyleInterpolator> &styleInterpolator,
    const std::shared_ptr<AnimationProgressProviderBase> &progressProvider)
    : name_(std::move(name)),
      shadowNode_(std::move(shadowNode)),
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

void CSSAnimation::setProgressProvider(
    const std::shared_ptr<AnimationProgressProviderBase> &progressProvider) {
  progressProvider_ = progressProvider;
}

folly::dynamic CSSAnimation::getCurrentFrame() const {
  return styleInterpolator_->interpolate(shadowNode_, progressProvider_);
}

folly::dynamic CSSAnimation::getResetStyle() const {
  return styleInterpolator_->getResetStyle(shadowNode_);
}

} // namespace reanimated::css
