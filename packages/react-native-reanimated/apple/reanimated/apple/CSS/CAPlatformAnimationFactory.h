#pragma once

#include <reanimated/CSS/core/CSSPlatformAnimationFactory.h>
#include <reanimated/apple/CSS/config.h>

#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

class CAPlatformAnimationFactory final : public CSSPlatformAnimationFactory {
 public:
  CAPlatformAnimationFactory(ApplyPlatformAnimationFunction applyFn, RemovePlatformAnimationFunction removeFn);

  PlatformRoutingResult resolve(
      Tag viewTag,
      const std::string &animationName,
      const std::unordered_set<std::string> &allProperties,
      const CSSKeyframesConfig &keyframesConfig,
      const std::shared_ptr<CSSAnimationSettings> &settings) override;

 private:
  const ApplyPlatformAnimationFunction applyFn_;
  const RemovePlatformAnimationFunction removeFn_;
};

} // namespace reanimated::css
