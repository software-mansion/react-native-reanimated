#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/CSS/core/CSSAnimationsGroup.h>
#include <reanimated/CSS/core/CSSPlatformAnimationFactory.h>
#include <reanimated/CSS/registries/CSSKeyframesRegistry.h>
#include <reanimated/CSS/utils/props.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated::css {

using CSSAnimationsMap = std::unordered_map<size_t, std::shared_ptr<CSSAnimation>>;

class CSSAnimationsRegistry : public UpdatesRegistry {
 public:
  CSSAnimationsRegistry(
      const std::shared_ptr<OperationsLoop> &loop,
      const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry,
      const std::shared_ptr<CSSPlatformAnimationFactory> &platformAnimationFactory);

  bool needsFlush() const;

  void apply(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::string &compoundComponentName,
      const CSSAnimationUpdates &updates);

  void flushUpdates(UpdatesBatch &updatesBatch);
#if REACT_NATIVE_VERSION_MINOR >= 85
  void flushUpdates(UpdatesBatchAnimatedProps &updatesBatch);
#endif

 private:
  class AnimationObserver : public CSSAnimation::Observer {
   public:
    explicit AnimationObserver(CSSAnimationsRegistry &owner);
    void onAnimationUpdate(Tag viewTag) override;
    void onAnimationNeedsRevert(Tag viewTag) override;

   private:
    CSSAnimationsRegistry &owner_;
  };

  const std::shared_ptr<OperationsLoop> loop_;
  const std::shared_ptr<CSSKeyframesRegistry> keyframesRegistry_;
  const std::shared_ptr<CSSPlatformAnimationFactory> platformAnimationFactory_;

  AnimationObserver animationObserver_{*this};

  std::unordered_map<Tag, CSSAnimationsGroup> groups_;
  // Tags reported by owned animations between flushes.
  std::unordered_set<Tag> updatedTags_;
  std::unordered_set<Tag> pendingRevertTags_;

  void removeTag(Tag viewTag) override;
  std::optional<CSSAnimationsGroup> maybeBuildNewGroup(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::string &compoundComponentName,
      const std::optional<std::vector<std::string>> &updatedAnimationNames,
      const CSSAnimationSettingsMap &newAnimationSettings);
  std::shared_ptr<CSSAnimation> createAnimation(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::string &name,
      const std::string &compoundComponentName,
      const CSSAnimationSettings &settings,
      double timestamp);
  void updateRegistryForRevertedAnimations();
};

} // namespace reanimated::css
