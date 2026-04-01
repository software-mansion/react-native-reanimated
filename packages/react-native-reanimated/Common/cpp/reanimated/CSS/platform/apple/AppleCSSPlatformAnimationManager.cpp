#ifdef __APPLE__

#include <reanimated/CSS/platform/apple/AppleCSSPlatformAnimationManager.h>

#include <string>
#include <unordered_set>
#include <vector>

namespace reanimated::css {

static const std::unordered_set<std::string> ANIMATABLE_PROPERTIES = {
    "opacity",
    "transform",
    "backgroundColor",
    "borderRadius",
    "borderColor",
    "shadowColor",
    "shadowOpacity",
    "shadowOffset",
    "shadowRadius",
};

const std::unordered_set<std::string> &AppleCSSPlatformAnimationManager::getAnimatableProperties() const {
  return ANIMATABLE_PROPERTIES;
}

AppleCSSPlatformAnimationManager::AppleCSSPlatformAnimationManager(
    ApplyPlatformAnimationsFunction applyFn,
    RemoveAllPlatformAnimationsFunction removeAllFn)
    : applyFn_(std::move(applyFn)), removeAllFn_(std::move(removeAllFn)) {}

void AppleCSSPlatformAnimationManager::applyAnimations(
    Tag viewTag,
    const std::vector<std::shared_ptr<CSSPlatformAnimation>> &animations,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  folly::dynamic animationsArray = folly::dynamic::array;
  for (const auto &animation : animations) {
    animationsArray.push_back(animation->buildConfig(viewStylesRepository));
  }
  applyFn_(viewTag, std::move(animationsArray));
}

void AppleCSSPlatformAnimationManager::removeAllAnimations(Tag viewTag) {
  removeAllFn_(viewTag);
}

} // namespace reanimated::css

#endif // __APPLE__
