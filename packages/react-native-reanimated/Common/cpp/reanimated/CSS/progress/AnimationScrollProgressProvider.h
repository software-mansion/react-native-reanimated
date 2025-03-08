#pragma once

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>

namespace reanimated {

class AnimationScrollProgressProvider final : public KeyframeProgressProvider {
 public:
  AnimationScrollProgressProvider(
      double timestamp,
      double duration,
      double delay);

 private:
  double timestamp_;
  double duration_;
  double delay_;
};

} // namespace reanimated
