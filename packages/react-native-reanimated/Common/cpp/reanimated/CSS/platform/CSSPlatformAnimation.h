#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <folly/dynamic.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated::css {

class CSSPlatformAnimation {
 public:
  CSSPlatformAnimation(
      Tag viewTag,
      std::string animationName,
      const std::unordered_map<std::string, RawPropertyKeyframes> &propertyKeyframes,
      const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasings,
      CSSAnimationSettings settings);

  const std::string &getAnimationName() const;

  folly::dynamic buildConfig(const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  folly::dynamic getFirstKeyframeValues() const;
  folly::dynamic getLastKeyframeValues() const;

  void setSettings(const CSSAnimationSettings &settings);

 private:
  Tag viewTag_;
  std::string animationName_;
  CSSAnimationSettings settings_;
  folly::dynamic config_;

  static folly::dynamic buildSettingsConfig(const CSSAnimationSettings &settings);
};

} // namespace reanimated::css
