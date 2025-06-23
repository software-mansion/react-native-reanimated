#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <memory>
#include <unordered_map>

namespace reanimated::css {

using KeyframeEasingFunctions = std::unordered_map<double, EasingFunction>;

struct CSSKeyframesConfig {
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

CSSKeyframesConfig parseCSSAnimationKeyframesConfig(
    jsi::Runtime &rt,
    const jsi::Value &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

} // namespace reanimated::css
