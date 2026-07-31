#include <reanimated/CSS/events/animationElapsedTime.h>

#include <algorithm>

namespace reanimated::css {

double animationStartElapsedTime(const AnimationProgressProvider &provider) {
  // A negative delay starts the animation partway through.
  const auto elapsedTime = std::max(0.0, -provider.getDelay());
  const auto iterationCount = provider.getIterationCount();

  // An infinite animation has no total duration to be capped against.
  if (iterationCount < 0) {
    return elapsedTime;
  }
  return std::min(elapsedTime, provider.getDuration() * iterationCount);
}

double animationIterationElapsedTime(const AnimationProgressProvider &provider) {
  return (provider.getCurrentIteration() - 1) * provider.getDuration();
}

double animationEndElapsedTime(const AnimationProgressProvider &provider) {
  return provider.getDuration() * provider.getIterationCount();
}

double animationCancelElapsedTime(const AnimationProgressProvider &provider, const double cancelTimestamp) {
  return std::max(0.0, cancelTimestamp - provider.getStartTimestamp(cancelTimestamp));
}

} // namespace reanimated::css
