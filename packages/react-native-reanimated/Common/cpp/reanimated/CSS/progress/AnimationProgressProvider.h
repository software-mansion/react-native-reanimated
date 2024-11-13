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
      double timestamp,
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
  double getPauseTimestamp() const {
    return pauseTimestamp_;
  }
  double getTotalPausedTime(double timestamp) const;
  double getStartTimestamp(double timestamp) const;

  double decorateProgress(double progress) const override;

  void pause(double timestamp);
  void play(double timestamp);
  void resetProgress() override;

 protected:
  std::optional<double> calculateRawProgress(double timestamp) override;

 private:
  double iterationCount_;
  AnimationDirection direction_;

  unsigned currentIteration_ = 1;
  double previousIterationsDuration_ = 0;
  double pauseTimestamp_ = 0;
  double totalPausedTime_ = 0;

  bool shouldFinish(double timestamp) const;

  double updateIterationProgress(double currentIterationElapsedTime);
  double applyAnimationDirection(double iterationProgress) const;
};

} // namespace reanimated
