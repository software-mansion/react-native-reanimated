#pragma once

#include <reanimated/CSS/CSSAnimation.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>

#include <chrono>

namespace reanimated {

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

class CSSKeyframeAnimation : public CSSAnimation {
 public:
  CSSKeyframeAnimation(
      jsi::Runtime &rt,
      ShadowNode::Shared shadowNode,
      const CSSAnimationConfig &config);

  void updateViewStyle(jsi::Runtime &rt, const jsi::Value &value) override {
    styleInterpolator.setFallbackValue(rt, value);
  }

  void start(time_t timestamp) override;

  void finish() override;

  jsi::Value update(jsi::Runtime &rt, time_t timestamp) override;

 private:
  AnimationStyleInterpolator styleInterpolator;
  AnimationProgressProvider progressProvider;
  const CSSAnimationFillMode fillMode;

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
