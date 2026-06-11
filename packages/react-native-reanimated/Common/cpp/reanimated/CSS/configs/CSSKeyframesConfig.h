#pragma once

#include <reanimated/CSS/easing/EasingConfigs.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolatorFactory.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <memory>
#include <string>

namespace reanimated::css {

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
