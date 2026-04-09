#pragma once

#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/configs/common.h>

#include <unordered_set>

namespace reanimated::css {

class CSSPlatformAnimation {
 public:
  const std::unordered_set<std::string> &setAnimatedProperties(
      const EasingConfig &easingConfig,
      const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs,
      const std::unordered_set<std::string> &allProperties);
  const std::unordered_set<std::string> &getAnimatedProperties() const;
  const std::unordered_set<std::string> &getNonAnimatedProperties() const;

 private:
  std::unordered_set<std::string> animatedProperties_;
  std::unordered_set<std::string> nonAnimatedProperties_;
};

} // namespace reanimated::css
