#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/core/CSSLoopAnimation.h>
#include <reanimated/CSS/core/CSSPlatformAnimation.h>
#include <reanimated/Fabric/updates/LoopOperation.h>

#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

class CSSAnimation : public LoopOperation {
 public:
  CSSAnimation(
      std::shared_ptr<const ShadowNode> shadowNode,
      std::string animationName,
      const CSSKeyframesConfig &cssKeyframesConfig,
      const CSSAnimationSettings &settings,
      double timestamp);

  void onUpdate(double timestamp) override;
  bool isRunning() const override;

  const std::string &getName() const;

  double getStartTimestamp(double timestamp) const;
  double getRemainingDelay(double timestamp) const;
  AnimationProgressState getState() const;

  bool hasForwardsFillMode() const;
  bool hasBackwardsFillMode() const;
  bool hasLoopAnimation() const;
  std::shared_ptr<CSSLoopAnimation> getLoopAnimation() const;

  folly::dynamic getBackwardsFillStyle() const;
  folly::dynamic getCurrentInterpolationStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const;
  folly::dynamic getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const;

  void updateSettings(const PartialCSSAnimationSettings &updatedSettings, double timestamp);

 private:
  const std::string name_;
  const std::shared_ptr<const ShadowNode> shadowNode_;
  const CSSKeyframesConfig keyframesConfig_;
  const std::shared_ptr<CSSAnimationSettings> settings_;

  std::shared_ptr<CSSLoopAnimation> loopAnimation_;
  CSSPlatformAnimation platformAnimation_;

  void updatePropertyRouting(double timestamp);
};

} // namespace reanimated::css
