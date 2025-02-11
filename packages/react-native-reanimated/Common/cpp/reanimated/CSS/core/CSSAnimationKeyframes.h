#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <memory>
#include <string>

#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>

namespace reanimated {

class CSSAnimationKeyframes {
 public:
  CSSAnimationKeyframes(const jsi::Value &config);

 private:
  const std::string name_;
  std::shared_ptr<AnimationStyleInterpolator> interpolator_;
  std::shared_ptr<KeyframeEasingFunctions> keyframeEasingFunctions_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
