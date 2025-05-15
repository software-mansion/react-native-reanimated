#pragma once

#include <reanimated/CSS/easing/utils.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <memory>
#include <unordered_map>

namespace reanimated::css {

using KeyframeEasings = std::unordered_map<double, std::shared_ptr<Easing>>;

struct CSSKeyframesConfig {
  std::shared_ptr<AnimationStyleInterpolator> styleInterpolator;
  std::shared_ptr<KeyframeEasings> keyframeEasings;
};

std::shared_ptr<AnimationStyleInterpolator> createStyleInterpolator(
    jsi::Runtime &rt,
    const jsi::Object &config);

std::shared_ptr<KeyframeEasings> parseKeyframeTimingFunctions(
    jsi::Runtime &rt,
    const jsi::Object &config);

CSSKeyframesConfig parseCSSAnimationKeyframesConfig(
    jsi::Runtime &rt,
    const jsi::Value &config);

} // namespace reanimated::css
