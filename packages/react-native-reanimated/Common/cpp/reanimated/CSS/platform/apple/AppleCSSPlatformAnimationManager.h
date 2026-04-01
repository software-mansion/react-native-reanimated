#pragma once
#ifdef __APPLE__

#include <reanimated/CSS/platform/ICSSPlatformAnimationManager.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <string>
#include <unordered_set>
#include <vector>

namespace reanimated::css {

class AppleCSSPlatformAnimationManager : public ICSSPlatformAnimationManager {
 public:
  AppleCSSPlatformAnimationManager(
      ApplyPlatformAnimationsFunction applyFn,
      RemoveAllPlatformAnimationsFunction removeAllFn);

  const std::unordered_set<std::string> &getAnimatableProperties() const override;

  void applyAnimations(
      Tag viewTag,
      const std::vector<std::shared_ptr<CSSPlatformAnimation>> &animations,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) override;

  void removeAllAnimations(Tag viewTag) override;

 private:
  ApplyPlatformAnimationsFunction applyFn_;
  RemoveAllPlatformAnimationsFunction removeAllFn_;
};

} // namespace reanimated::css

#endif // __APPLE__
