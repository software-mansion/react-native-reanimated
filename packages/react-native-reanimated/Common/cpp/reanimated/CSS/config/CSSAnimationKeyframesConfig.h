#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/easing/EasingFunctions.h>

namespace reanimated {

using KeyframeEasingFunctions = std::unordered_map<double, EasingFunction>;

struct CSSAnimationKeyframesConfig {
  std::string animationName;
  std::shared_ptr<AnimationStyleInterpolator> styleInterpolator;
  std::shared_ptr<KeyframeEasingFunctions> keyframeEasingFunctions;
};

std::string getAnimationName(jsi::Runtime &rt, const jsi::Object &config);

std::shared_ptr<AnimationStyleInterpolator> getStyleInterpolator(
    jsi::Runtime &rt,
    const jsi::Object &config);

std::shared_ptr<KeyframeEasingFunctions> getKeyframeTimingFunctions(
    jsi::Runtime &rt,
    const jsi::Object &config);

CSSAnimationKeyframesConfig parseCSSAnimationKeyframesConfig(
    jsi::Runtime &rt,
    const jsi::Object &config);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
