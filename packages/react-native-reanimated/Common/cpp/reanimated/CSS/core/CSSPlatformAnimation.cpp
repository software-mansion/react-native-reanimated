#include <reanimated/CSS/core/CSSPlatformAnimation.h>

namespace reanimated::css {

const std::unordered_set<std::string> &CSSPlatformAnimation::setAnimatedProperties(
    const EasingConfig & /*easingConfig*/,
    const std::shared_ptr<KeyframeEasingConfigs> & /*keyframeEasingConfigs*/,
    const std::unordered_set<std::string> &allProperties) {
  // Placeholder: platform branch is disabled for now.
  // Route all properties through the loop animation.
  animatedProperties_.clear();
  nonAnimatedProperties_ = allProperties;

  return nonAnimatedProperties_;
}

const std::unordered_set<std::string> &CSSPlatformAnimation::getAnimatedProperties() const {
  return animatedProperties_;
}

const std::unordered_set<std::string> &CSSPlatformAnimation::getNonAnimatedProperties() const {
  return nonAnimatedProperties_;
}

} // namespace reanimated::css
