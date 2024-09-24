#pragma once

#include <reanimated/CSS/CSSAnimation.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/TransitionStyleInterpolator.h>

#include <vector>

using namespace facebook;
using namespace react;

namespace reanimated {

struct CSSTransitionConfig {
  // TODO - maybe add support for separate
  // transition property configs
  jsi::Array transitionProperty;
  double transitionDuration;
  jsi::Value &transitionTimingFunction;
  double transitionDelay;
};

class CSSTransition : public CSSAnimation { // TODO - implement
 public:
  CSSTransition(
      jsi::Runtime &rt,
      ShadowNode::Shared shadowNode,
      const CSSTransitionConfig &config);

  void updateViewStyle(jsi::Runtime &rt, const jsi::Value &value) override {
    styleInterpolator.updateViewStyle(rt, value);
  }

  void start(time_t timestamp) override;

  void finish(const bool revertChanges) override;

  jsi::Value update(jsi::Runtime &rt, time_t timestamp) override;

  jsi::Value reset(jsi::Runtime &rt) override;

 private:
  TransitionStyleInterpolator styleInterpolator;
};

} // namespace reanimated
