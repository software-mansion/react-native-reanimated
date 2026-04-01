#pragma once

#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/CSS/platform/CSSPlatformAnimation.h>

#include <memory>
#include <string>
#include <unordered_set>
#include <vector>

namespace reanimated::css {

class ICSSPlatformAnimationManager {
 public:
  virtual ~ICSSPlatformAnimationManager() = default;

  virtual const std::unordered_set<std::string> &getAnimatableProperties() const = 0;

  virtual void applyAnimations(
      Tag viewTag,
      const std::vector<std::shared_ptr<CSSPlatformAnimation>> &animations,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) = 0;

  virtual void removeAllAnimations(Tag viewTag) = 0;
};

} // namespace reanimated::css
