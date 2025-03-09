#include <reanimated/CSS/progress/animation/AnimationProgressProviderBase.h>

namespace reanimated::css {

AnimationProgressProviderBase::AnimationProgressProviderBase(
    const double iterationCount,
    const AnimationDirection direction,
    EasingFunction easingFunction,
    const std::shared_ptr<KeyframeEasingFunctions> &keyframeEasingFunctions)
    : iterationCount_(iterationCount),
      direction_(direction),
      easingFunction_(std::move(easingFunction)),
      keyframeEasingFunctions_(keyframeEasingFunctions) {}

bool AnimationProgressProviderBase::isReversed() const {
  return direction_ == AnimationDirection::Reverse ||
      direction_ == AnimationDirection::AlternateReverse;
}

AnimationDirection AnimationProgressProviderBase::getDirection() const {
  return direction_;
}

void AnimationProgressProviderBase::setIterationCount(
    const double iterationCount) {
  resetProgress();
  iterationCount_ = iterationCount;
}

void AnimationProgressProviderBase::setDirection(
    const AnimationDirection direction) {
  resetProgress();
  direction_ = direction;
}

void AnimationProgressProviderBase::setEasingFunction(
    const EasingFunction &easingFunction) {
  resetProgress();
  easingFunction_ = easingFunction;
}

} // namespace reanimated::css
