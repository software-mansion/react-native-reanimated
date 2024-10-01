#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>

#include <react/renderer/core/ShadowNode.h>

#include <chrono>

namespace reanimated {

enum AnimationState {
  pending,
  running,
  paused,
  finished,
};

class CSSAnimation {
 public:
  CSSAnimation(
      jsi::Runtime &rt,
      ShadowNode::Shared shadowNode,
      const CSSAnimationConfig &config,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const time_t startTime);

  AnimationState getState() const {
    return state;
  }
  ShadowNode::Shared getShadowNode() const {
    return shadowNode;
  }
  double getDelay() const {
    return progressProvider.getDelay();
  }
  bool hasForwardsFillMode() const {
    return fillMode == forwards || fillMode == both;
  }
  bool hasBackwardsFillMode() const {
    return fillMode == backwards || fillMode == both;
  }

  jsi::Value getBackwardsFillStyle(jsi::Runtime &rt) const;
  jsi::Value getForwardsFillStyle(jsi::Runtime &rt) const;
  jsi::Value getCurrentStyle(jsi::Runtime &rt) const;

  void updateSettings(jsi::Runtime &rt, const jsi::Value &settings);

  void run();
  jsi::Value update(jsi::Runtime &rt, time_t timestamp);

 private:
  const ShadowNode::Shared shadowNode;
  const AnimationFillMode fillMode;

  AnimationState state = AnimationState::pending;
  AnimationStyleInterpolator styleInterpolator;
  AnimationProgressProvider progressProvider;

  InterpolationUpdateContext createUpdateContext(
      jsi::Runtime &rt,
      double progress,
      bool directionChanged) const;
};

} // namespace reanimated
