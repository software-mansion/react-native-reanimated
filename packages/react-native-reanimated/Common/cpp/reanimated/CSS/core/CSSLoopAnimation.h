#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/core/CSSAnimationObserver.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <functional>
#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

class CSSLoopAnimation : public OperationsLoop::LoopOperation, public std::enable_shared_from_this<CSSLoopAnimation> {
 public:
  /// Reports a milestone of the run together with the time elapsed by then.
  using MilestoneReporter = std::function<void(RunMilestone, double elapsedTimeMs)>;

  CSSLoopAnimation(
      Tag viewTag,
      const std::shared_ptr<AnimationStyleInterpolator> &interpolator,
      const std::shared_ptr<CSSAnimationSettings> &settings,
      const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs,
      CSSAnimationObserver &observer,
      double timestamp);

  AnimationProgressState getState() const {
    return progressProvider_->getState();
  }
  folly::dynamic getCurrentInterpolationStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const;

  void setAnimatedProperties(const std::unordered_set<std::string> &loopDrivenProperties);

  void setMilestoneReporter(MilestoneReporter reporter);
  void abort(double timestamp);

  bool update(double timestamp, OperationsLoop &loop) override;

  void schedule(OperationsLoop &loop);
  void unschedule(OperationsLoop &loop);

  void updateSettings(const PartialCSSAnimationSettings &updatedSettings, double timestamp);

 private:
  static constexpr double FALLBACK_INTERPOLATION_THRESHOLD = 0.5;

  const Tag viewTag_;
  const std::shared_ptr<CSSAnimationSettings> settings_;
  const std::shared_ptr<AnimationStyleInterpolator> interpolator_;
  const std::shared_ptr<AnimationProgressProvider> progressProvider_;
  CSSAnimationObserver &observer_;
};

} // namespace reanimated::css
