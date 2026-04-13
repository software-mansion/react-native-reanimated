#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>
#include <reanimated/Fabric/updates/LoopOperation.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <memory>
#include <unordered_set>

namespace reanimated::css {

class CSSLoopAnimation : public LoopOperation {
 public:
  CSSLoopAnimation(
      const std::shared_ptr<AnimationStyleInterpolator> &interpolator,
      const std::unordered_set<std::string> &allProperties,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::shared_ptr<CSSAnimationSettings> &settings,
      const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs,
      const std::shared_ptr<std::unordered_set<Tag>> &updatedViewTags,
      const std::shared_ptr<std::unordered_set<Tag>> &revertedTags,
      const std::shared_ptr<OperationsLoop> &loop,
      double timestamp);

  // LoopOperation interface
  void onUpdate(double timestamp) override;
  bool isRunning() const override;

  void schedule();
  void unschedule();

  AnimationProgressState getState() const;

  folly::dynamic getCurrentInterpolationStyle() const;

  void setAnimatedProperties(const std::unordered_set<std::string> &loopDrivenProperties);
  void updateSettings(const PartialCSSAnimationSettings &updatedSettings, double timestamp);

 private:
  const std::shared_ptr<CSSAnimationSettings> settings_;
  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<AnimationProgressProvider> progressProvider_;
  const std::shared_ptr<AnimationStyleInterpolator> interpolator_;
  const std::shared_ptr<OperationsLoop> loop_;

  const std::unordered_set<std::string> allProperties_;
  const std::shared_ptr<std::unordered_set<Tag>> updatedViewTags_;
  const std::shared_ptr<std::unordered_set<Tag>> revertedTags_;
};

} // namespace reanimated::css
