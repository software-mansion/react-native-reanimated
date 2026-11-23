#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>
#include <reanimated/CSS/progress/RunLifecycle.h>
#include <reanimated/CSS/progress/TimeProgressProvider.h>

#include <memory>
#include <vector>

namespace reanimated::css {

enum class AnimationProgressState : std::uint8_t {
  Pending, // When the animation is waiting for the delay to pass
  Running,
  Paused,
  Finished
};

class AnimationProgressProvider final : public KeyframeProgressProvider, public TimeProgressProvider {
 public:
  AnimationProgressProvider(
      double timestamp,
      double duration,
      double delay,
      double iterationCount,
      AnimationDirection direction,
      EasingFunction easingFunction,
      const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs);

  double getDuration() const {
    return duration_;
  }
  double getDelay() const {
    return delay_;
  }
  double getIterationCount() const {
    return iterationCount_;
  }
  unsigned getCurrentIteration() const {
    return currentIteration_;
  }
  AnimationDirection getDirection() const;
  AnimationProgressState getState() const;
  double getStartTimestamp(double timestamp) const;
  double getGlobalProgress() const override;
  double getKeyframeProgress(double fromOffset, double toOffset) const override;

  void setIterationCount(double iterationCount);
  void setDirection(AnimationDirection direction);
  void setEasingFunction(const EasingFunction &easingFunction);

  /// Time the animation has run by the given milestone, in milliseconds.
  double elapsedTimeAt(MilestoneTime time) const;

  void setMilestoneReporter(RunLifecycle::Reporter reporter);
  void abort(double timestamp);

  /// Starts recording the keyframe progress values that an interpolation reads.
  void beginInterpolation();
  void endInterpolation();
  /// True if the last recorded interpolation would read the same keyframe
  /// progress values at the current progress, so its result can't have changed.
  /// This is the case between the steps of a `steps()` easing.
  bool isLastInterpolationUnchanged() const;

  void pause(double timestamp);
  void play(double timestamp);
  void update(double timestamp) override;
  void resetProgress() override;

 protected:
  std::optional<double> calculateRawProgress(double timestamp) override;

 private:
  struct KeyframeProgressSample {
    double fromOffset;
    double toOffset;
    double progress;
  };

  double iterationCount_;
  AnimationDirection direction_;
  EasingFunction easingFunction_;
  std::shared_ptr<KeyframeEasingConfigs> keyframeEasingConfigs_;

  // Survives resetProgress, because updateSettings re-times the run rather than
  // starting a new one.
  RunLifecycle lifecycle_;

  unsigned currentIteration_ = 1;
  double previousIterationsDuration_ = 0;
  double pauseTimestamp_ = 0;
  double totalPausedTime_ = 0;
  // The lifecycle reports an abort without a timestamp, so abort() leaves one here.
  double cancelTimestamp_ = 0;

  // Written from the const getKeyframeProgress while an interpolation is recorded.
  mutable std::vector<KeyframeProgressSample> keyframeProgressSamples_;
  bool isRecordingInterpolation_ = false;

  double computeKeyframeProgress(double fromOffset, double toOffset) const;
  double getTotalPausedTime(double timestamp) const;
  bool shouldFinish(double timestamp) const;
  RunPhase computePhase(double timestamp) const;

  double intervalStart() const;
  double iterationStart() const;
  double iterationEnd() const;
  double intervalEnd() const;
  double activeTimeAtCancel() const;

  double updateIterationProgress(double currentIterationElapsedTime);
  double applyAnimationDirection(double iterationProgress) const;
};

} // namespace reanimated::css
