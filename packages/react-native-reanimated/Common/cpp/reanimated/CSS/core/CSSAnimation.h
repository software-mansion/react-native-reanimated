#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/core/CSSLoopAnimation.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

class CSSAnimation {
 public:
  CSSAnimation(
      Tag viewTag,
      std::string animationName,
      const CSSKeyframesConfig &cssKeyframesConfig,
      const CSSAnimationSettings &settings,
      const std::shared_ptr<std::unordered_set<Tag>> &updatedViewTags,
      const std::shared_ptr<std::unordered_set<Tag>> &revertedTags,
      const std::shared_ptr<OperationsLoop> &loop,
      double timestamp);

  const std::string &getName() const;

  AnimationProgressState getState() const;

  bool hasForwardsFillMode() const;
  bool hasBackwardsFillMode() const;

  folly::dynamic getBackwardsFillStyle() const;
  folly::dynamic getCurrentInterpolationStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const;
  folly::dynamic getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const;

  void schedule();
  void unschedule();

  void updateSettings(const PartialCSSAnimationSettings &updatedSettings, double timestamp);

 private:
  const std::string name_;
  const std::shared_ptr<CSSAnimationSettings> settings_;
  const std::shared_ptr<AnimationStyleInterpolator> styleInterpolator_;
  const std::shared_ptr<CSSLoopAnimation> loopAnimation_;

  bool isReversed() const;
};

} // namespace reanimated::css
