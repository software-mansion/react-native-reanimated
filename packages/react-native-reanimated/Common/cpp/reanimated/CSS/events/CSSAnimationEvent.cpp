#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/CSS/events/CSSAnimationEvent.h>

#include <algorithm>

namespace reanimated::css {

CSSEvent createAnimationStartEvent(const facebook::react::Tag viewTag, const std::shared_ptr<CSSAnimation> &animation) {
  const auto activeDuration = animation->getDuration() * animation->getIterationCount();
  const auto elapsedTime = std::min(std::max(-animation->getDelay(), 0.0), activeDuration);
  return {viewTag, "animationstart", animation->getName(), elapsedTime};
}

CSSEvent createAnimationIterationEvent(
    const facebook::react::Tag viewTag,
    const std::shared_ptr<CSSAnimation> &animation,
    const unsigned iteration) {
  const auto elapsedTime = static_cast<double>(iteration - 1) * animation->getDuration();
  return {viewTag, "animationiteration", animation->getName(), elapsedTime};
}

CSSEvent createAnimationEndEvent(const facebook::react::Tag viewTag, const std::shared_ptr<CSSAnimation> &animation) {
  const auto elapsedTime = animation->getDuration() * animation->getIterationCount();
  return {viewTag, "animationend", animation->getName(), elapsedTime};
}

} // namespace reanimated::css
