#pragma once

#include <reanimated/CSS/progress/ProgressProvider.h>

namespace reanimated {

enum class TransitionProgressState { PENDING, RUNNING, FINISHED };

class TransitionPropertyProgressProvider : public ProgressProvider {
 public:
  TransitionProgressState getState(const time_t timestamp) const {
    return TransitionProgressState::FINISHED; // TODO
  }

 protected:
  std::optional<double> calculateRawProgress(const time_t timestamp) override;

 private:
  double getElapsedTime(const time_t timestamp) const;
};

} // namespace reanimated
