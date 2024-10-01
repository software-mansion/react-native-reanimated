#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>

#include <react/renderer/core/ShadowNode.h>

#include <chrono>

namespace reanimated {

enum CSSAnimationFillMode { none, forwards, backwards, both };

enum CSSAnimationState {
  pending,
  running,
  paused,
  // Animation is finishing if its progress reached the last frame
  finishing,
  finished,
  // Animation is in the reverting state if its removal was scheduled from JS
  // and all changes applied during the animation will be reverted
  reverting,
  reverted
};

class CSSAnimation {
 public:
  CSSAnimation(
      jsi::Runtime &rt,
      ShadowNode::Shared shadowNode,
      const CSSAnimationConfig &config,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  CSSAnimationState getState() const {
    return state;
  }
  ShadowNode::Shared getShadowNode() const {
    return shadowNode;
  }

  void updateSettings(jsi::Runtime &rt, const jsi::Value &settings);

  void start(time_t timestamp);
  void finish(const bool revertChanges);
  jsi::Value update(jsi::Runtime &rt, time_t timestamp);
  jsi::Value reset(jsi::Runtime &rt);

 private:
  const ShadowNode::Shared shadowNode;
  const CSSAnimationFillMode fillMode;

  CSSAnimationState state = CSSAnimationState::pending;
  AnimationStyleInterpolator styleInterpolator;
  AnimationProgressProvider progressProvider;

  static CSSAnimationDirection getAnimationDirection(const std::string &str);
  static CSSAnimationFillMode getAnimationFillMode(const std::string &str);

  InterpolationUpdateContext createUpdateContext(
      jsi::Runtime &rt,
      double progress,
      bool directionChanged) const;

  jsi::Value maybeApplyBackwardsFillMode(jsi::Runtime &rt);
  jsi::Value maybeApplyForwardsFillMode(jsi::Runtime &rt);
};

} // namespace reanimated
