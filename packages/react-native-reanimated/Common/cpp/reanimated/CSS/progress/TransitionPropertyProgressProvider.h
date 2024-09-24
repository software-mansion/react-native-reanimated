#pragma once

#include <reanimated/CSS/progress/ProgressProvider.h>

namespace reanimated {

class TransitionPropertyProgressProvider : public ProgressProvider {
 protected:
  std::optional<double> calculateRawProgress(time_t timestamp) override;

 private:
  double getElapsedTime(time_t timestamp) const;
};

} // namespace reanimated
