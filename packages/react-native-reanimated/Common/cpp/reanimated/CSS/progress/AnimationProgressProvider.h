#pragma once

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/progress/ProgressProvider.h>

namespace reanimated {

enum class AnimationProgressState {
  PENDING, // When the animation is waiting for the delay to pass
  RUNNING,
  PAUSED,
  FINISHED
};

class AnimationProgressProvider : public ProgressProvider {
 public:
  AnimationProgressProvider(
      double duration,
      double delay,
      double iterationCount,
      AnimationDirection direction,
      const EasingFunction &easingFunction);

  void setIterationCount(double iterationCount) {
    resetProgress();
    iterationCount_ = iterationCount;
  }
  void setDirection(AnimationDirection direction) {
    resetProgress();
    direction_ = direction;
  }

  AnimationProgressState getState(double timestamp) const;

  void pause(double timestamp);
  void play(double timestamp);
  void resetProgress() override;

 protected:
  std::optional<double> calculateRawProgress(double timestamp) override;

  double decorateProgress(double progress) const override {
    return applyAnimationDirection(progress);
  }

 private:
  double iterationCount_;
  AnimationDirection direction_;

  unsigned currentIteration_ = 1;
  double previousIterationsDuration_ = 0;
  time_t pauseTimestamp_ = 0;
  time_t pausedTimeBefore_ = 0;

  inline time_t getTotalPausedTime(double timestamp) const;
  bool shouldFinish(double timestamp) const;

  double updateIterationProgress(double currentIterationElapsedTime);
  double applyAnimationDirection(double iterationProgress) const;
};

} // namespace reanimated
