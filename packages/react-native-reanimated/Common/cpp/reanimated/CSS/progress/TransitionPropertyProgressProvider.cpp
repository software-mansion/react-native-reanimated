#include <reanimated/CSS/progress/TransitionPropertyProgressProvider.h>

namespace reanimated {

std::optional<double> TransitionPropertyProgressProvider::calculateRawProgress(
    const time_t timestamp) {
  return getElapsedTime(timestamp) / duration_;
}

double TransitionPropertyProgressProvider::getElapsedTime(
    const time_t timestamp) const {
  return timestamp - (startTime_ + delay_);
}

} // namespace reanimated
