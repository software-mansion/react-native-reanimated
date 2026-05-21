#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>
#include <reanimated/CSS/progress/RawProgressProvider.h>

#include <memory>

namespace reanimated::css {

enum class AnimationProgressState : std::uint8_t {
  Pending, // When the animation is waiting for the delay to pass
  Running,
  Paused,
  Finished
};

class AnimationProgressProvider final : public KeyframeProgressProvider, public RawProgressProvider {
 public:
  AnimationProgressProvider(
      double timestamp,
      double duration,
      double delay,
      double iterationCount,
      AnimationDirection direction,
      EasingFunction easingFunction,
      const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs);

  void setIterationCount(double iterationCount);
  void setDirection(AnimationDirection direction);
  void setEasingFunction(const EasingFunction &easingFunction);

  AnimationDirection getDirection() const;
  double getGlobalProgress() const override;
  double getKeyframeProgress(double fromOffset, double toOffset) const override;

  AnimationProgressState getState() const;
  double getStartTimestamp(double timestamp) const;

  void pause(double timestamp);
  void play(double timestamp);
  void update(double timestamp) override;
  void resetProgress() override;

 protected:
  std::optional<double> calculateRawProgress(double timestamp) override;

 private:
  double iterationCount_;
  AnimationDirection direction_;
  EasingFunction easingFunction_;
  std::shared_ptr<KeyframeEasingConfigs> keyframeEasingConfigs_;

  AnimationProgressState state_ = AnimationProgressState::Pending;
  unsigned currentIteration_ = 1;
  double previousIterationsDuration_ = 0;
  double pauseTimestamp_ = 0;
  double totalPausedTime_ = 0;

  double getTotalPausedTime(double timestamp) const;
  bool shouldFinish(double timestamp) const;
  AnimationProgressState computeState(double timestamp) const;

  double updateIterationProgress(double currentIterationElapsedTime);
  double applyAnimationDirection(double iterationProgress) const;
};

} // namespace reanimated::css
