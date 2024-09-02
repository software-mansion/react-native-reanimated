#pragma once

#include <reanimated/CSS/EasingFunctions.h>
#include <reanimated/CSS/interpolation/KeyframedStyleInterpolator.h>

#include <react/renderer/core/ShadowNode.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <chrono>
#include <optional>
#include <stdexcept>
#include <unordered_map>
#include <utility>

namespace reanimated {

using namespace facebook;
using namespace react;

enum CSSAnimationState { pending, running, finished };
enum CSSAnimationDirection { normal, reverse, alternate, alternateReverse };

struct CSSAnimationConfig {
  jsi::Object keyframedStyle;
  double animationDuration;
  std::string animationTimingFunction;
  double animationDelay;
  double animationIterationCount;
  std::string animationDirection;
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

  void start(time_t timestamp);
  jsi::Value update(jsi::Runtime &rt, time_t timestamp);
  void finish();

 private:
  const ShadowNode::Shared shadowNode;

  KeyframedStyleInterpolator styleInterpolator;
  const double delay;
  const CSSAnimationDirection direction;
  const double duration;
  const double iterationCount;
  const EasingFunction easingFunction;

  CSSAnimationState state = CSSAnimationState::pending;
  time_t startTime = 0;
  unsigned currentIteration = 1;
  double currentIterationElapsedTime = 0;
  double previousIterationsDuration = 0;
  std::optional<double> previousProgress;
  std::optional<double> previousToPreviousProgress;

  static CSSAnimationDirection getAnimationDirection(const std::string &str);

  double getCurrentIterationProgress(time_t timestamp) const;

  void maybeUpdateIterationNumber(time_t timestamp);
};

} // namespace reanimated
