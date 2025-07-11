#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

#include <folly/dynamic.h>
#include <jsi/JSIDynamic.h>
#include <memory>
#include <string>
#include <unordered_map>

namespace reanimated::css {

using namespace facebook;
using namespace jsi;

using KeyframeEasingFunctions = std::unordered_map<double, EasingFunction>;

struct CSSKeyframesConfig {
  folly::dynamic keyframes;
  std::shared_ptr<KeyframeEasingFunctions> keyframeEasingFunctions;
};

CSSKeyframesConfig parseCSSAnimationKeyframesConfig(
    jsi::Runtime &rt,
    const jsi::Value &config);

} // namespace reanimated::css
