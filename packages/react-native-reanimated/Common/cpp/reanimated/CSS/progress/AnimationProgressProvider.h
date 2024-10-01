#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/progress/ProgressProvider.h>

namespace reanimated {

class AnimationProgressProvider : public ProgressProvider {
 public:
  AnimationProgressProvider(
      const double duration,
      const double delay,
      const double iterationCount,
      const AnimationDirection direction,
      const EasingFunction easingFunction);

  void setIterationCount(const double iterationCount) {
    resetProgress();
    iterationCount_ = iterationCount;
  }
  void setDirection(const AnimationDirection direction) {
    resetProgress();
    direction_ = direction;
  }
  ProgressState getState(const time_t timestamp) const override;

  void pause(const time_t timestamp);
  void play(const time_t timestamp);
  void resetProgress() override;

 protected:
  std::optional<double> calculateRawProgress(const time_t timestamp) override;

  double decorateProgress(const double progress) const override {
    return applyAnimationDirection(progress);
  }

 private:
  double iterationCount_;
  AnimationDirection direction_;

  unsigned currentIteration_ = 1;
  double previousIterationsDuration_ = 0;
  time_t pauseTimestamp_ = 0;
  time_t pausedTimeBefore_ = 0;

  inline time_t getTotalPausedTime(const time_t timestamp) const;
  bool shouldFinish(const time_t timestamp) const;

  double updateIterationProgress(const double currentIterationElapsedTime);
  double applyAnimationDirection(const double iterationProgress) const;
};

} // namespace reanimated
