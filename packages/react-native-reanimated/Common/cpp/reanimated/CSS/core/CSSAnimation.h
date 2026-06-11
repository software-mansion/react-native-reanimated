#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/core/CSSPlatformAnimation.h>
#include <reanimated/CSS/core/CSSPlatformAnimationFactory.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <memory>
#include <string>

namespace reanimated::css {

class CSSLoopAnimation;

class CSSAnimation {
 public:
  class Observer {
   public:
    virtual ~Observer() = default;
    virtual void onAnimationUpdate(Tag viewTag) = 0;
    // Called when the animation finishes without `forwards` fill mode and will
    // need to be reverted to the underlying style on the next flush.
    virtual void onAnimationNeedsRevert(Tag viewTag) = 0;
  };

  CSSAnimation(
      Tag viewTag,
      std::string animationName,
      const CSSKeyframesConfig &cssKeyframesConfig,
      const CSSAnimationSettings &settings,
      Observer &observer,
      const std::shared_ptr<CSSPlatformAnimationFactory> &platformAnimationFactory,
      double timestamp);

  const std::string &getName() const {
    return name_;
  }

  AnimationProgressState getState() const;

  bool hasForwardsFillMode() const {
    return settings_->hasForwardsFillMode();
  }

  bool hasBackwardsFillMode() const {
    return settings_->hasBackwardsFillMode();
  }

  folly::dynamic getBackwardsFillStyle() const;
  folly::dynamic getCurrentInterpolationStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const;
  folly::dynamic getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const;

  void schedule(OperationsLoop &loop);
  void unschedule(OperationsLoop &loop);

  void updateSettings(const PartialCSSAnimationSettings &updatedSettings, double timestamp);

 private:
  const Tag viewTag_;
  const std::string name_;
  const CSSKeyframesConfig keyframesConfig_;
  const std::shared_ptr<CSSAnimationSettings> settings_;
  const std::shared_ptr<OperationsLoop> loop_;
  const std::shared_ptr<AnimationStyleInterpolator> styleInterpolator_;
  const std::shared_ptr<CSSLoopAnimation> loopAnimation_;
  const std::shared_ptr<CSSPlatformAnimationFactory> platformAnimationFactory_;
  std::shared_ptr<CSSPlatformAnimation> platformAnimation_;

  bool isReversed() const;
  void updatePropertyRouting();
};

} // namespace reanimated::css
