#pragma once

#include <reanimated/CSS/configs/common.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolatorFactory.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <memory>
#include <string>
#include <unordered_map>

namespace reanimated::css {

using KeyframeEasingFunctions = std::unordered_map<double, EasingFunction>;
using KeyframeEasingConfigs = std::unordered_map<double, EasingConfig>;

struct CSSKeyframesConfig {
  std::shared_ptr<AnimationStyleInterpolatorFactory> styleInterpolatorFactory;
  std::shared_ptr<KeyframeEasingConfigs> keyframeEasingConfigs;
};

CSSKeyframesConfig parseCSSAnimationKeyframesConfig(
    jsi::Runtime &rt,
    const jsi::Value &config,
    const std::string &compoundComponentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

} // namespace reanimated::css
