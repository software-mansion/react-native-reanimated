#pragma once

#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/CSS/util/DelayedItemsManager.h>
#include <reanimated/CSS/util/props.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <memory>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

using AnimationsMap =
    std::unordered_map<std::string, std::shared_ptr<CSSAnimation>>;
using AnimationsVector = std::vector<std::shared_ptr<CSSAnimation>>;

class CSSAnimationsRegistry
    : public UpdatesRegistry,
      std::enable_shared_from_this<CSSAnimationsRegistry> {
 public:
  using SettingsUpdates =
      std::vector<std::pair<unsigned, PartialCSSAnimationSettings>>;

  bool hasUpdates() const;
  bool isEmpty() const override;

  void apply(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const std::vector<std::string> &animationNames,
      const AnimationsMap &addedAnimations,
      const std::unordered_map<std::string, PartialCSSAnimationSettings>
          &settingsUpdates,
      double timestamp);
  void remove(Tag viewTag);
  void removeBatch(const std::vector<Tag> &tagsToRemove) override;

  void update(double timestamp);

 private:
  using Registry = std::unordered_map<Tag, AnimationsVector>;
  using RunningAnimationIndicesMap =
      std::unordered_map<Tag, std::set<unsigned>>;
  using AnimationsToRevertMap =
      std::unordered_map<Tag, std::unordered_set<unsigned>>;

  Registry registry_;

  RunningAnimationIndicesMap runningAnimationIndicesMap_;
  AnimationsToRevertMap animationsToRevertMap_;
  DelayedItemsManager<std::pair<Tag, unsigned>> delayedAnimationsManager_;

  AnimationsVector getAnimationsVector(
      Tag viewTag,
      const std::vector<std::string> &animationNames,
      const AnimationsMap &addedAnimations) const;
  void updateAnimationSettings(
      const AnimationsVector &animationsVector,
      const std::unordered_map<std::string, PartialCSSAnimationSettings>
          &settingsUpdates,
      double timestamp);

  void updateViewAnimations(
      Tag viewTag,
      const std::vector<unsigned> &animationIndices,
      double timestamp,
      bool addToBatch);
  void scheduleOrActivateAnimation(
      const std::shared_ptr<CSSAnimation> &animation,
      double timestamp);
  void removeViewAnimations(Tag viewTag);
  void applyViewAnimationsStyle(Tag viewTag, double timestamp);
  void activateDelayedAnimations(double timestamp);
  void handleAnimationsToRevert(double timestamp);

  static bool addStyleUpdates(
      folly::dynamic &target,
      const folly::dynamic &updates,
      bool shouldOverride);
};

} // namespace reanimated
