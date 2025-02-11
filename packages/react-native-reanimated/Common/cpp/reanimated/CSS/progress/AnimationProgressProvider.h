#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/config/CSSAnimationKeyframesConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>
#include <reanimated/CSS/progress/RawProgressProvider.h>

#include <memory>

namespace reanimated {

enum class AnimationProgressState {
  Pending, // When the animation is waiting for the delay to pass
  Running,
  Paused,
  Finished
};

class AnimationProgressProvider final : public KeyframeProgressProvider,
                                        public RawProgressProvider {
 public:
  AnimationProgressProvider(
      double timestamp,
      double duration,
      double delay,
      double iterationCount,
      AnimationDirection direction,
      EasingFunction easingFunction,
      const std::shared_ptr<KeyframeEasingFunctions> &keyframeEasingFunctions);

  void setIterationCount(double iterationCount) {
    resetProgress();
    iterationCount_ = iterationCount;
  }
  void setDirection(AnimationDirection direction) {
    resetProgress();
    direction_ = direction;
  }
  void setEasingFunction(const EasingFunction &easingFunction) {
    resetProgress();
    easingFunction_ = easingFunction;
  }

  AnimationDirection getDirection() const {
    return direction_;
  }
  double getGlobalProgress() const override {
    return applyAnimationDirection(rawProgress_.value_or(0));
  }
  bool isFirstUpdate() const override {
    return !previousRawProgress_.has_value();
  }
  double getKeyframeProgress(double fromOffset, double toOffset) const override;
  AnimationProgressState getState(double timestamp) const;
  double getPauseTimestamp() const {
    return pauseTimestamp_;
  }
  double getTotalPausedTime(double timestamp) const;
  double getStartTimestamp(double timestamp) const;

  void pause(double timestamp);
  void play(double timestamp);
  void resetProgress() override;

 protected:
  std::optional<double> calculateRawProgress(double timestamp) override;

 private:
  double iterationCount_;
  AnimationDirection direction_;
  EasingFunction easingFunction_;
  std::shared_ptr<KeyframeEasingFunctions> keyframeEasingFunctions_;

  unsigned currentIteration_ = 1;
  double previousIterationsDuration_ = 0;
  double pauseTimestamp_ = 0;
  double totalPausedTime_ = 0;

  bool shouldFinish(double timestamp) const;

  double updateIterationProgress(double currentIterationElapsedTime);
  double applyAnimationDirection(double iterationProgress) const;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
