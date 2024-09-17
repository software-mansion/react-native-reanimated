#pragma once

#include <reanimated/CSS/EasingFunctions.h>
#include <reanimated/CSS/interpolation/KeyframedStyleInterpolator.h>

#include <chrono>
#include <cmath>
#include <optional>
#include <stdexcept>
#include <unordered_map>
#include <utility>

namespace reanimated {

enum CSSAnimationState { pending, running, finishing, finished };
enum CSSAnimationDirection { normal, reverse, alternate, alternateReverse };
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
  const double delay;
  const CSSAnimationDirection direction;
  const double duration;
  const double iterationCount;
  const EasingFunction easingFunction;
  const CSSAnimationFillMode fillMode;

  CSSAnimationState state = CSSAnimationState::pending;
  time_t startTime = 0;
  unsigned currentIteration = 1;
  double currentIterationElapsedTime = 0;
  double previousIterationsDuration = 0;
  std::optional<double> previousProgress;
  std::optional<double> previousToPreviousProgress;

  static CSSAnimationDirection getAnimationDirection(const std::string &str);

  static CSSAnimationFillMode getAnimationFillMode(const std::string &str);

  double updateIterationProgress(time_t timestamp);

  double applyAnimationDirection(double iterationProgress) const;

  double calculateResultingProgress(double iterationProgress, bool shouldFinish)
      const;

  bool checkDirectionChange(double progress) const;

  InterpolationUpdateContext createUpdateContext(
      jsi::Runtime &rt,
      double progress,
      bool directionChanged) const;

  jsi::Value maybeApplyBackwardsFillMode(jsi::Runtime &rt);

  jsi::Value maybeApplyForwardsFillMode(jsi::Runtime &rt);
};

} // namespace reanimated
