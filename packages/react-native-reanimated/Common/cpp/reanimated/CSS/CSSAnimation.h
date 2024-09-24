#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/KeyframedStyleInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>

#include <chrono>

namespace reanimated {

enum CSSAnimationState { pending, running, finishing, finished };
enum CSSAnimationFillMode { none, forwards, backwards, both };

struct CSSAnimationConfig {
  jsi::Object keyframedStyle;
  double animationDuration;
  jsi::Value &animationTimingFunction;
  double animationDelay;
  double animationIterationCount;
  std::string animationDirection;
  std::string animationFillMode;
};

class CSSAnimation {
 public:
  CSSAnimation(
      jsi::Runtime &rt,
      ShadowNode::Shared shadowNode,
      const CSSAnimationConfig &config);

  CSSAnimationState getState() const {
    return state;
  }

  ShadowNode::Shared getShadowNode() const {
    return shadowNode;
  }

  void setViewStyle(jsi::Runtime &rt, const jsi::Value &value) {
    styleInterpolator.setFallbackValue(rt, value);
  }

  void start(time_t timestamp);
  void finish();
  jsi::Value update(jsi::Runtime &rt, time_t timestamp);

 private:
  const ShadowNode::Shared shadowNode;

  KeyframedStyleInterpolator styleInterpolator;
  AnimationProgressProvider progressProvider;
  const CSSAnimationFillMode fillMode;

  CSSAnimationState state = CSSAnimationState::pending;

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
