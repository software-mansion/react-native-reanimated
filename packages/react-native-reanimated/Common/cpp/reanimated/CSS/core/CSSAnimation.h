#pragma once

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>

namespace reanimated {

class CSSAnimation {
 public:
  CSSAnimation(
      jsi::Runtime &rt,
      unsigned id,
      const ShadowNode::Shared &shadowNode,
      const CSSAnimationConfig &config,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      time_t startTime);

  unsigned getId() const {
    return id_;
  }
  ShadowNode::Shared getShadowNode() const {
    return shadowNode_;
  }
  bool hasForwardsFillMode() const {
    return fillMode_ == AnimationFillMode::FORWARDS ||
        fillMode_ == AnimationFillMode::BOTH;
  }
  bool hasBackwardsFillMode() const {
    return fillMode_ == AnimationFillMode::BACKWARDS ||
        fillMode_ == AnimationFillMode::BOTH;
  }
  AnimationProgressState getState(double timestamp) const {
    return progressProvider_.getState(timestamp);
  }
  double getDelay() const {
    return progressProvider_.getDelay();
  }
  double getStartTime() const {
    return progressProvider_.getStartTime();
  }
  jsi::Value getViewStyle(jsi::Runtime &rt) const {
    return styleInterpolator_.getStyleValue(rt, shadowNode_);
  }
  jsi::Value getBackwardsFillStyle(jsi::Runtime &rt);

  void run(double timestamp);
  jsi::Value update(jsi::Runtime &rt, double timestamp);

  void updateSettings(
      const PartialCSSAnimationSettings &updatedSettings,
      double timestamp);

 private:
  const unsigned id_;
  const ShadowNode::Shared shadowNode_;

  AnimationStyleInterpolator styleInterpolator_;
  AnimationProgressProvider progressProvider_;

  AnimationFillMode fillMode_;

  PropertyInterpolationUpdateContext createUpdateContext(
      jsi::Runtime &rt,
      double progress,
      bool directionChanged) const;
};

} // namespace reanimated
