#pragma once

#include <reanimated/CSS/progress/animation/AnimationProgressProviderBase.h>
#include <reanimated/CSS/progress/common/TimeProgressProviderBase.h>

namespace reanimated::css {

enum class AnimationProgressState {
  Pending, // When the animation is waiting for the delay to pass
  Running,
  Paused,
  Finished
};

class AnimationTimeProgressProvider final
    : public AnimationProgressProviderBase,
      public TimeProgressProviderBase {
 public:
  AnimationTimeProgressProvider(
      double timestamp,
      double duration,
      double delay,
      double iterationCount,
      AnimationDirection direction,
      EasingFunction easingFunction,
      const std::shared_ptr<KeyframeEasingFunctions> &keyframeEasingFunctions);

  double getGlobalProgress() const override;
  double getKeyframeProgress(double fromOffset, double toOffset) const override;

  AnimationProgressState getState(double timestamp) const;
  double getPauseTimestamp() const;
  double getTotalPausedTime(double timestamp) const;
  double getStartTimestamp(double timestamp) const;

  void pause(double timestamp);
  void play(double timestamp);
  void resetProgress() override;

 protected:
  std::optional<double> calculateRawProgress(double timestamp) override;

 private:
  unsigned currentIteration_ = 1;
  double previousIterationsDuration_ = 0;
  double pauseTimestamp_ = 0;
  double totalPausedTime_ = 0;

  bool shouldFinish(double timestamp) const;
  double updateIterationProgress(double currentIterationElapsedTime);
  double applyAnimationDirection(double iterationProgress) const;
};

} // namespace reanimated::css
