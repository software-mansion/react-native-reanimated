#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>

#include <folly/dynamic.h>
#include <memory>
#include <string>
#include <unordered_map>

namespace reanimated::css {

using KeyframeEasingFunctions = std::unordered_map<double, EasingFunction>;

struct CSSKeyframesConfig {
  std::shared_ptr<AnimationStyleInterpolator> styleInterpolator;
  std::shared_ptr<KeyframeEasingFunctions> keyframeEasingFunctions;
};

CSSKeyframesConfig parseCSSAnimationKeyframesConfig(
    const folly::dynamic &config);

} // namespace reanimated::css
