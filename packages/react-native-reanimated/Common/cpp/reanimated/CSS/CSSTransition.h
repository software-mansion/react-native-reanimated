#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/TransitionStyleInterpolator.h>

#include <vector>

namespace reanimated {

class CSSTransition { // TODO - implement
 public:
  CSSTransition(
      jsi::Runtime &rt,
      ShadowNode::Shared shadowNode,
      const CSSTransitionConfig &config);

  void updateSettings(jsi::Runtime &rt, const jsi::Value &settings);

  void start(time_t timestamp);
  void finish(const bool revertChanges);
  jsi::Value update(jsi::Runtime &rt, time_t timestamp);
  jsi::Value reset(jsi::Runtime &rt);

 private:
  const ShadowNode::Shared shadowNode;
  TransitionStyleInterpolator styleInterpolator;
};

} // namespace reanimated
