#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>
#include <reanimated/Fabric/updates/LoopOperation.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <memory>
#include <unordered_set>

namespace reanimated::css {

class CSSLoopAnimation : public LoopOperation, public std::enable_shared_from_this<CSSLoopAnimation> {
 public:
  CSSLoopAnimation(
      Tag viewTag,
      const std::shared_ptr<AnimationStyleInterpolator> &interpolator,
      const std::shared_ptr<CSSAnimationSettings> &settings,
      const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs,
      const std::shared_ptr<std::unordered_set<Tag>> &updatedViewTags,
      const std::shared_ptr<std::unordered_set<Tag>> &revertedTags,
      const std::shared_ptr<OperationsLoop> &loop,
      double timestamp);

  void onUpdate(double timestamp) override;
  bool isRunning() const override;

  AnimationProgressState getState() const;

  folly::dynamic getCurrentInterpolationStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const;

  void schedule();
  void unschedule();

  void updateSettings(const PartialCSSAnimationSettings &updatedSettings, double timestamp);

 private:
  static constexpr double FALLBACK_INTERPOLATION_THRESHOLD = 0.5;

  const Tag viewTag_;
  const std::shared_ptr<CSSAnimationSettings> settings_;
  const std::shared_ptr<AnimationStyleInterpolator> interpolator_;
  const std::shared_ptr<AnimationProgressProvider> progressProvider_;
  const std::shared_ptr<std::unordered_set<Tag>> updatedViewTags_;
  const std::shared_ptr<std::unordered_set<Tag>> revertedTags_;
  const std::shared_ptr<OperationsLoop> loop_;
};

} // namespace reanimated::css
