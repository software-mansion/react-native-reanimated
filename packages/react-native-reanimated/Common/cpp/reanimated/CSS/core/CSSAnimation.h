#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/core/CSSAnimationObserver.h>
#include <reanimated/CSS/core/CSSPlatformAnimation.h>
#include <reanimated/CSS/core/CSSPlatformAnimationFactory.h>
#include <reanimated/CSS/events/CSSEvent.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <memory>
#include <string>

namespace reanimated::css {

class CSSLoopAnimation;

class CSSAnimation {
 public:
  CSSAnimation(
      Tag viewTag,
      std::string animationName,
      const CSSKeyframesConfig &cssKeyframesConfig,
      const CSSAnimationSettings &settings,
      CSSAnimationObserver &observer,
      const std::shared_ptr<CSSPlatformAnimationFactory> &platformAnimationFactory,
      double timestamp);

  ~CSSAnimation();

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

  void setEventMask(CSSEventMask eventMask);

  void schedule(OperationsLoop &loop);
  void unschedule(OperationsLoop &loop);

  void updateSettings(const PartialCSSAnimationSettings &updatedSettings, double timestamp);

  void reportCancellation(double timestamp);

 private:
  const Tag viewTag_;
  const std::string name_;
  CSSAnimationObserver &observer_;
  const CSSKeyframesConfig keyframesConfig_;
  const std::shared_ptr<CSSAnimationSettings> settings_;
  const std::shared_ptr<OperationsLoop> loop_;
  const std::shared_ptr<AnimationStyleInterpolator> styleInterpolator_;
  const std::shared_ptr<CSSLoopAnimation> loopAnimation_;
  const std::shared_ptr<CSSPlatformAnimationFactory> platformAnimationFactory_;
  std::shared_ptr<CSSPlatformAnimation> platformAnimation_;

  CSSEventMask eventMask_{0};

  bool isReversed() const;
  void updatePropertyRouting();

  void reportMilestone(RunMilestone milestone, double elapsedTimeMs);
  void emitEvent(CSSEventType type, double elapsedTimeMs) const;
};

} // namespace reanimated::css
