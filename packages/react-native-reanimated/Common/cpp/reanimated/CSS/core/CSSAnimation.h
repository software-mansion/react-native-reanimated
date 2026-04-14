#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/core/CSSLoopAnimation.h>
#include <reanimated/CSS/core/CSSPlatformAnimation.h>
#include <reanimated/CSS/core/CSSPlatformAnimationFactory.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

class CSSAnimation {
 public:
  CSSAnimation(
      std::shared_ptr<const ShadowNode> shadowNode,
      std::string animationName,
      const CSSKeyframesConfig &cssKeyframesConfig,
      const CSSAnimationSettings &settings,
      const std::shared_ptr<std::unordered_set<Tag>> &updatedViewTags,
      const std::shared_ptr<std::unordered_set<Tag>> &revertedTags,
      const std::shared_ptr<OperationsLoop> &loop,
      const std::shared_ptr<CSSPlatformAnimationFactory> &platformAnimationFactory,
      double timestamp);

  const std::string &getName() const;

  bool hasForwardsFillMode() const;
  bool hasBackwardsFillMode() const;

  bool hasLoopAnimation() const;
  std::shared_ptr<CSSLoopAnimation> getLoopAnimation() const;

  folly::dynamic getBackwardsFillStyle() const;
  folly::dynamic getForwardsFillStyle() const;
  folly::dynamic getResetStyle() const;

  void schedule();
  void unschedule();

  void updateSettings(const PartialCSSAnimationSettings &updatedSettings, double timestamp);

 private:
  const std::string name_;
  const CSSKeyframesConfig keyframesConfig_;

  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<CSSAnimationSettings> settings_;
  const std::shared_ptr<std::unordered_set<Tag>> updatedViewTags_;
  const std::shared_ptr<std::unordered_set<Tag>> revertedTags_;
  const std::shared_ptr<OperationsLoop> loop_;
  const std::shared_ptr<CSSPlatformAnimationFactory> platformAnimationFactory_;

  std::shared_ptr<CSSLoopAnimation> loopAnimation_;
  std::shared_ptr<CSSPlatformAnimation> platformAnimation_;

  bool isReversed() const;
  void updatePropertyRouting(double timestamp);
};

} // namespace reanimated::css
