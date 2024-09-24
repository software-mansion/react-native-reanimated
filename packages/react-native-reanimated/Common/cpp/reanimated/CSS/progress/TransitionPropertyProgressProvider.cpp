#include <reanimated/CSS/progress/TransitionPropertyProgressProvider.h>

namespace reanimated {

std::optional<double> TransitionPropertyProgressProvider::calculateRawProgress(
    time_t timestamp) {
  return getElapsedTime(timestamp) / duration;
}

double TransitionPropertyProgressProvider::getElapsedTime(
    time_t timestamp) const {
  return timestamp - (startTime + delay);
}

} // namespace reanimated
