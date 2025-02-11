#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <memory>
#include <unordered_map>

namespace reanimated {

using KeyframeEasingFunctions = std::unordered_map<double, EasingFunction>;

struct CSSAnimationKeyframesConfig {
  std::shared_ptr<AnimationStyleInterpolator> styleInterpolator;
  std::shared_ptr<KeyframeEasingFunctions> keyframeEasingFunctions;
};

std::shared_ptr<AnimationStyleInterpolator> getStyleInterpolator(
    jsi::Runtime &rt,
    const jsi::Object &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

std::shared_ptr<KeyframeEasingFunctions> getKeyframeTimingFunctions(
    jsi::Runtime &rt,
    const jsi::Object &config);

CSSAnimationKeyframesConfig parseCSSAnimationKeyframesConfig(
    jsi::Runtime &rt,
    const jsi::Value &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
