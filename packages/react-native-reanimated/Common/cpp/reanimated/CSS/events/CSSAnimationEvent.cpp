#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/CSS/events/CSSAnimationEvent.h>

#include <algorithm>

namespace reanimated::css {

CSSAnimationEvent createAnimationStartEvent(
    const facebook::react::Tag viewTag,
    const std::shared_ptr<CSSAnimation> &animation) {
  const auto activeDuration = animation->getDuration() * animation->getIterationCount();
  const auto elapsedTime = std::min(std::max(-animation->getDelay(), 0.0), activeDuration);
  return {viewTag, CSSAnimationEventType::AnimationStart, animation->getName(), elapsedTime};
}

CSSAnimationEvent createAnimationIterationEvent(
    const facebook::react::Tag viewTag,
    const std::shared_ptr<CSSAnimation> &animation,
    const unsigned iteration) {
  const auto elapsedTime = static_cast<double>(iteration - 1) * animation->getDuration();
  return {viewTag, CSSAnimationEventType::AnimationIteration, animation->getName(), elapsedTime};
}

CSSAnimationEvent createAnimationEndEvent(
    const facebook::react::Tag viewTag,
    const std::shared_ptr<CSSAnimation> &animation) {
  const auto elapsedTime = animation->getDuration() * animation->getIterationCount();
  return {viewTag, CSSAnimationEventType::AnimationEnd, animation->getName(), elapsedTime};
}

} // namespace reanimated::css
