#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/core/CSSPlatformAnimation.h>

#include <react/renderer/core/ReactPrimitives.h>

#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

struct PlatformRoutingResult {
  std::shared_ptr<CSSPlatformAnimation> animation;
  std::unordered_set<std::string> remainingProperties;
};

class CSSPlatformAnimationFactory {
 public:
  virtual ~CSSPlatformAnimationFactory() = default;

  virtual PlatformRoutingResult resolve(
      Tag viewTag,
      const std::string &animationName,
      const std::unordered_set<std::string> &allProperties,
      const CSSKeyframesConfig &keyframesConfig,
      const std::shared_ptr<CSSAnimationSettings> &settings) = 0;
};

} // namespace reanimated::css
