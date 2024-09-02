#pragma once

#include <reanimated/CSS/EasingFunctions.h>
#include <reanimated/CSS/interpolation/KeyframedStyleInterpolator.h>

#include <react/renderer/core/ShadowNode.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <chrono>
#include <optional>
#include <utility>

namespace reanimated {

using namespace facebook;
using namespace react;

enum CSSAnimationState { pending, running, finished };

struct CSSAnimationConfig {
  double animationDuration;
  std::string animationTimingFunction;
  jsi::Object keyframedStyle;
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

  const double duration;
  const EasingFunction easingFunction;
  KeyframedStyleInterpolator styleInterpolator;

  time_t startTime;
  CSSAnimationState state;
  std::optional<double> previousProgress;
  std::optional<double> previousToPreviousProgress;
};

} // namespace reanimated
