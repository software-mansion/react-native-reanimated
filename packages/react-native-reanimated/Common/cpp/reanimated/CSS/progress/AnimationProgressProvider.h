#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/progress/ProgressProvider.h>

namespace reanimated {

class AnimationProgressProvider : public ProgressProvider {
 public:
  AnimationProgressProvider(
      double duration,
      double delay,
      double iterationCount,
      AnimationDirection direction,
      EasingFunction easingFunction);

  void reset(time_t startTime) override;

 protected:
  std::optional<double> calculateRawProgress(time_t timestamp) override;

  double decorateProgress(double progress) const override {
    return applyAnimationDirection(progress);
  }

 private:
  const double iterationCount;
  const AnimationDirection direction;

  unsigned currentIteration = 1;
  double previousIterationsDuration = 0;

  bool shouldFinish() const;

  double updateIterationProgress(
      time_t timestamp,
      double currentIterationElapsedTime);

  double applyAnimationDirection(double iterationProgress) const;
};

} // namespace reanimated
