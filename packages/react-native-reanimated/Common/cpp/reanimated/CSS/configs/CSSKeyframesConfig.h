#pragma once

#include <reanimated/CSS/configs/common.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolatorFactory.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#ifdef __APPLE__
#include <reanimated/apple/CSS/keyframes.h>
#endif

#include <memory>
#include <string>

namespace reanimated::css {

struct CSSKeyframesConfig {
  std::shared_ptr<AnimationStyleInterpolatorFactory> styleInterpolatorFactory;
  std::shared_ptr<KeyframeEasingConfigs> keyframeEasingConfigs;
#ifdef __APPLE__
  std::shared_ptr<CAKeyframesMap> platformSupportedProperties;
#endif
};

CSSKeyframesConfig parseCSSAnimationKeyframesConfig(
    jsi::Runtime &rt,
    const jsi::Value &config,
    const std::string &compoundComponentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

} // namespace reanimated::css
