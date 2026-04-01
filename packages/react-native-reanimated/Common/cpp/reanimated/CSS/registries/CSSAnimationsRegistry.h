#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/CSS/platform/ICSSPlatformAnimationManager.h>
#include <reanimated/CSS/registries/CSSKeyframesRegistry.h>
#include <reanimated/CSS/registries/StaticPropsRegistry.h>
#include <reanimated/CSS/utils/DelayedItemsManager.h>
#include <reanimated/CSS/utils/props.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <memory>
#include <mutex>
#include <set>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated::css {

using CSSAnimations = std::vector<std::shared_ptr<CSSAnimation>>;
using CSSAnimationsMap = std::unordered_map<size_t, std::shared_ptr<CSSAnimation>>;

class CSSAnimationsRegistry : public UpdatesRegistry {
 public:
  CSSAnimationsRegistry(
      std::shared_ptr<StaticPropsRegistry> staticPropsRegistry,
      std::shared_ptr<ViewStylesRepository> viewStylesRepository,
      std::shared_ptr<CSSKeyframesRegistry> keyframesRegistry,
      std::shared_ptr<ICSSPlatformAnimationManager> platformManager = nullptr);

  bool isEmpty() const override;
  bool hasUpdates() const;

  void apply(
      jsi::Runtime &rt,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::string &compoundComponentName,
      const jsi::Value &animationUpdates,
      double timestamp);
  void remove(Tag viewTag) override;
  void update(double timestamp);

 private:
  using RunningAnimationIndicesMap = std::unordered_map<Tag, std::set<size_t>>;
  using AnimationsToRevertMap = std::unordered_map<Tag, std::unordered_set<size_t>>;

  std::unordered_map<Tag, CSSAnimations> registry_;
  std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;
  std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  std::shared_ptr<CSSKeyframesRegistry> keyframesRegistry_;
  std::shared_ptr<ICSSPlatformAnimationManager> platformManager_;

  RunningAnimationIndicesMap runningAnimationIndicesMap_;
  AnimationsToRevertMap animationsToRevertMap_;
  DelayedItemsManager<std::shared_ptr<CSSAnimation>> delayedAnimationsManager_;

  // Animation creation and resolution
  CSSAnimations resolveAnimations(
      jsi::Runtime &rt,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::string &compoundComponentName,
      const CSSAnimationUpdates &updates,
      double timestamp);
  std::shared_ptr<CSSAnimation> createAnimation(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::string &animationName,
      const std::string &compoundComponentName,
      const CSSAnimationSettings &settings,
      double timestamp);
  CSSAnimations buildAnimationsVector(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::optional<std::vector<std::string>> &animationNames,
      const std::optional<CSSAnimationsMap> &newAnimations) const;

  // Loop animation management
  void scheduleOrActivateAnimation(
      size_t animationIndex,
      const std::shared_ptr<CSSAnimation> &animation,
      double timestamp);
  void removeViewAnimations(Tag viewTag);
  void updateViewAnimations(
      Tag viewTag,
      const std::vector<size_t> &animationIndices,
      double timestamp,
      bool addToBatch);
  void applyViewAnimationsStyle(Tag viewTag, double timestamp);
  void activateDelayedAnimations(double timestamp);
  void handleAnimationsToRevert(double timestamp);

  // Platform animation management
  void applyPlatformAnimations(Tag viewTag, bool force = false);
  void commitPlatformFillValues(
      Tag viewTag,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const CSSAnimations &animations);
  void revertPlatformValues(
      Tag viewTag,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const CSSAnimation &animation);

  static bool mergeStyleUpdates(
      folly::dynamic &target,
      const folly::dynamic &updates,
      bool shouldOverride);
};

} // namespace reanimated::css
