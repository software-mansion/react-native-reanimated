#pragma once

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/config/CSSKeyframesConfig.h>
#include <reanimated/CSS/progress/common/KeyframeProgressProvider.h>

namespace reanimated::css {

class AnimationProgressProviderBase : public KeyframeProgressProvider {
 public:
  AnimationProgressProviderBase(
      double iterationCount,
      AnimationDirection direction,
      EasingFunction easingFunction,
      const std::shared_ptr<KeyframeEasingFunctions> &keyframeEasingFunctions);

  bool isReversed() const;
  AnimationDirection getDirection() const;

  void setIterationCount(double iterationCount);
  void setDirection(AnimationDirection direction);
  void setEasingFunction(const EasingFunction &easingFunction);

  virtual void resetProgress() = 0;

 protected:
  double iterationCount_;
  AnimationDirection direction_;
  EasingFunction easingFunction_;
  std::shared_ptr<KeyframeEasingFunctions> keyframeEasingFunctions_;
};

} // namespace reanimated::css
