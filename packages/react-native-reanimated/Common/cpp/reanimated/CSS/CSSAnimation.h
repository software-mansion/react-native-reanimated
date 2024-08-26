#pragma once

#include <reanimated/CSS/EasingFunctions.h>

#include <react/renderer/core/ShadowNode.h>

#include <folly/dynamic.h>
#include <chrono>
#include <utility>

namespace reanimated {

using namespace facebook;
using namespace react;

enum CSSAnimationState { pending, running, finished };

struct CSSAnimationConfig {
  double animationDuration;
  EasingFunction easingFunction;
  folly::dynamic keyframedStyle;
};

class CSSAnimation {
 public:
  CSSAnimation(ShadowNode::Shared shadowNode, const CSSAnimationConfig &config);

  CSSAnimationState getState() const {
    return state;
  }
  ShadowNode::Shared getShadowNode() const {
    return shadowNode;
  }

  void start(time_t timestamp);
  folly::dynamic update(time_t timestamp);
  void finish();

 private:
  const ShadowNode::Shared shadowNode;
  CSSAnimationState state;
  time_t startTime;
  const double duration;
  const EasingFunction easingFunction;
  const folly::dynamic keyframedStyle;

  folly::dynamic currentKeyframeIndexes;

  folly::dynamic buildKeyframeIndexMap() const;
  folly::dynamic applyKeyframeInterpolation(double progress);

  folly::dynamic traverseAndConstruct(
      const folly::dynamic &value,
      folly::dynamic *currentIndex,
      std::function<folly::dynamic(
          const folly::dynamic &keyframes,
          folly::dynamic *currentIndex)> callback) const;
};

} // namespace reanimated
