#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/Interpolator.h>

#include <chrono>

namespace reanimated {

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
  CSSAnimation(ShadowNode::Shared shadowNode) : shadowNode(shadowNode) {}

  CSSAnimationState getState() const {
    return state;
  }

  ShadowNode::Shared getShadowNode() const {
    return shadowNode;
  }

  virtual void updateSettings(jsi::Runtime &rt, const jsi::Value &settings) = 0;

  virtual void updateViewStyle(jsi::Runtime &rt, const jsi::Value &value) = 0;

  virtual void start(time_t timestamp) = 0;

  virtual void finish(const bool revertChanges) = 0;

  virtual jsi::Value update(jsi::Runtime &rt, time_t timestamp) = 0;

  virtual jsi::Value reset(jsi::Runtime &rt) = 0;

 protected:
  const ShadowNode::Shared shadowNode;

  CSSAnimationState state = CSSAnimationState::pending;
};

} // namespace reanimated
