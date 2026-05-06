#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>
#include <reanimated/Fabric/updates/LoopOperation.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

class CSSAnimation : public LoopOperation, public std::enable_shared_from_this<CSSAnimation> {
 public:
  static constexpr double FALLBACK_INTERPOLATION_THRESHOLD = 0.5;

  CSSAnimation(
      Tag viewTag,
      std::string animationName,
      const CSSKeyframesConfig &cssKeyframesConfig,
      const CSSAnimationSettings &settings,
      const std::shared_ptr<std::unordered_set<Tag>> &updatedViewTags,
      const std::shared_ptr<std::unordered_set<Tag>> &revertedTags,
      const std::shared_ptr<OperationsLoop> &loop,
      double timestamp);

  bool update(double timestamp) override;

  const std::string &getName() const;

  double getStartTimestamp(double timestamp) const;
  AnimationProgressState getState() const;

  bool isReversed() const;
  bool hasForwardsFillMode() const;
  bool hasBackwardsFillMode() const;

  folly::dynamic getBackwardsFillStyle() const;
  folly::dynamic getCurrentInterpolationStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const;
  folly::dynamic getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const;

  void schedule();
  void unschedule();

  void updateSettings(const PartialCSSAnimationSettings &updatedSettings, double timestamp);

 private:
  const Tag viewTag_;
  const std::string name_;
  AnimationFillMode fillMode_;

  const std::shared_ptr<std::unordered_set<Tag>> updatedViewTags_;
  const std::shared_ptr<std::unordered_set<Tag>> revertedTags_;
  const std::shared_ptr<OperationsLoop> loop_;

  const std::shared_ptr<AnimationStyleInterpolator> styleInterpolator_;
  const std::shared_ptr<AnimationProgressProvider> progressProvider_;
};

} // namespace reanimated::css
