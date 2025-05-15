#pragma once

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/config/CSSKeyframesConfig.h>
#include <reanimated/CSS/easing/utils.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>
#include <reanimated/CSS/progress/RawProgressProvider.h>

#include <memory>
#include <utility>

namespace reanimated::css {

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
      std::shared_ptr<Easing> easing,
      std::shared_ptr<KeyframeEasings> keyframeEasings);

  void setIterationCount(double iterationCount);
  void setDirection(AnimationDirection direction);
  void setEasingFunction(const EasingFunction &easingFunction);

  AnimationDirection getDirection() const;
  double getGlobalProgress() const override;
  double getKeyframeProgress(double fromOffset, double toOffset) const override;
  AnimationProgressState getState() const;
  double getPauseTimestamp() const;
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
  std::shared_ptr<Easing> easing_;
  std::shared_ptr<KeyframeEasings> keyframeEasings_;

  unsigned currentIteration_ = 1;
  double previousIterationsDuration_ = 0;
  double pauseTimestamp_ = 0;
  double totalPausedTime_ = 0;

  bool shouldFinish(double timestamp) const;

  double updateIterationProgress(double currentIterationElapsedTime);
  double applyAnimationDirection(double iterationProgress) const;
};

} // namespace reanimated::css
