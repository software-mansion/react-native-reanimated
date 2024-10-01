#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>

#include <react/renderer/core/ShadowNode.h>

#include <chrono>
namespace reanimated {

class CSSAnimation {
 public:
  CSSAnimation(
      jsi::Runtime &rt,
      const unsigned id,
      const ShadowNode::Shared shadowNode,
      const CSSAnimationConfig &config,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const time_t startTime);

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
  ProgressState getState(const time_t timestamp) const {
    return progressProvider_.getState(timestamp);
  }
  double getDelay() const {
    return progressProvider_.getDelay();
  }
  time_t getStartTime() const {
    return progressProvider_.getStartTime();
  }
  jsi::Value getBackwardsFillStyle(jsi::Runtime &rt) const;
  jsi::Value getForwardsFillStyle(jsi::Runtime &rt) const;
  jsi::Value getViewStyle(jsi::Runtime &rt) const;

  void run(const time_t timestamp);
  jsi::Value update(jsi::Runtime &rt, time_t timestamp);

  void updateSettings(
      jsi::Runtime &rt,
      const PartialCSSAnimationSettings &updatedSettings,
      const time_t timestamp);

 private:
  const unsigned id_;
  const ShadowNode::Shared shadowNode_;
  AnimationFillMode fillMode_;

  AnimationStyleInterpolator styleInterpolator_;
  AnimationProgressProvider progressProvider_;

  InterpolationUpdateContext createUpdateContext(
      jsi::Runtime &rt,
      const double progress,
      const bool directionChanged) const;
};

} // namespace reanimated
