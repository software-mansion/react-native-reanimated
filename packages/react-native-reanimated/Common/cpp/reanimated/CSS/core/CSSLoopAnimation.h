#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

class CSSLoopAnimation : public OperationsLoop::LoopOperation, public std::enable_shared_from_this<CSSLoopAnimation> {
 public:
  CSSLoopAnimation(
      Tag viewTag,
      std::string animationName,
      const std::shared_ptr<AnimationStyleInterpolator> &interpolator,
      const std::shared_ptr<CSSAnimationSettings> &settings,
      const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs,
      CSSAnimation::Observer &observer,
      double timestamp);

  AnimationProgressState getState() const {
    return progressProvider_->getState();
  }

  folly::dynamic getCurrentInterpolationStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const;

  bool update(double timestamp, OperationsLoop &loop) override;

  void schedule(OperationsLoop &loop);
  void unschedule(OperationsLoop &loop);

  void setAnimatedProperties(const std::unordered_set<std::string> &loopDrivenProperties);
  void updateSettings(const PartialCSSAnimationSettings &updatedSettings, double timestamp);

  /// Emits a cancel event when the animation is torn down before finishing.
  void reportCancellation(double timestamp);

 private:
  static constexpr double FALLBACK_INTERPOLATION_THRESHOLD = 0.5;

  const Tag viewTag_;
  const std::string animationName_;
  const std::shared_ptr<CSSAnimationSettings> settings_;
  const std::shared_ptr<AnimationStyleInterpolator> interpolator_;
  const std::shared_ptr<AnimationProgressProvider> progressProvider_;
  CSSAnimation::Observer &observer_;

  AnimationProgressState lastObservedState_;
  unsigned lastObservedIteration_;

  /// Diffs the progress state captured before the last provider update against
  /// the current one and emits the boundaries that were crossed.
  void reportProgressEvents(double timestamp);
  void reportStart();
  void reportIterations(double timestamp);
  void reportEnd();
};

} // namespace reanimated::css
