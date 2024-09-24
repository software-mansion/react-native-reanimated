#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/Interpolator.h>

#include <chrono>

namespace reanimated {

enum CSSAnimationState {
  pending,
  running,
  finishing,
  reverting,
  finished,
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
