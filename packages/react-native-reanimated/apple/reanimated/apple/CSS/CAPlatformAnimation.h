#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/configs/common.h>
#include <reanimated/CSS/core/CSSPlatformAnimation.h>
#include <reanimated/apple/CSS/config.h>

#include <memory>
#include <string>

namespace reanimated::css {

class CAPlatformAnimation final : public CSSPlatformAnimation {
 public:
  CAPlatformAnimation(
      Tag viewTag,
      std::string name,
      std::shared_ptr<const CAKeyframesMap> data,
      std::shared_ptr<CSSAnimationSettings> settings,
      std::shared_ptr<KeyframeEasingConfigs> keyframeEasings,
      ApplyPlatformAnimationFunction applyFn,
      RemovePlatformAnimationFunction removeFn);

  void schedule() override;
  void unschedule() override;

 private:
  const Tag viewTag_;
  const std::string name_;
  const std::shared_ptr<const CAKeyframesMap> data_;
  const std::shared_ptr<CSSAnimationSettings> settings_;
  const std::shared_ptr<KeyframeEasingConfigs> keyframeEasings_;
  const ApplyPlatformAnimationFunction applyFn_;
  const RemovePlatformAnimationFunction removeFn_;

  PlatformAnimationConfig buildConfig() const;
};

} // namespace reanimated::css
