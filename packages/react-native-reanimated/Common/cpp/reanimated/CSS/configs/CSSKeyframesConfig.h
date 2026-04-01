#pragma once

#include <reanimated/CSS/easing/EasingConfig.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated::css {

using KeyframeEasingConfigs = std::unordered_map<double, EasingConfig>;

struct RawPropertyKeyframes {
  std::vector<std::pair<double, folly::dynamic>> keyframes;
};

struct CSSKeyframesConfig {
  // Interpolator for props driven by the C++ loop (shadow tree commits).
  // Only contains non-platform-animatable properties.
  std::shared_ptr<AnimationStyleInterpolator> styleInterpolator;
  std::shared_ptr<KeyframeEasingConfigs> keyframeEasingConfigs;
  // Raw keyframe values for platform-animatable properties only.
  std::unordered_map<std::string, RawPropertyKeyframes> platformPropertyKeyframes;
};

CSSKeyframesConfig parseCSSAnimationKeyframesConfig(
    jsi::Runtime &rt,
    const jsi::Value &config,
    const std::string &compoundComponentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::unordered_set<std::string> &platformAnimatableProperties);

} // namespace reanimated::css
