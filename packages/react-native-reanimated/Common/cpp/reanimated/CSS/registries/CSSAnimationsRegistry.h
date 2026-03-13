#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/CSS/events/CSSAnimationEvent.h>
#include <reanimated/CSS/events/CSSEventsEmitter.h>
#include <reanimated/CSS/utils/DelayedItemsManager.h>
#include <reanimated/CSS/utils/props.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <memory>
#include <set>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated::css {

using CSSAnimationsMap = std::unordered_map<size_t, std::shared_ptr<CSSAnimation>>;
using CSSAnimationsVector = std::vector<std::shared_ptr<CSSAnimation>>;

class CSSAnimationsRegistry : public UpdatesRegistry, std::enable_shared_from_this<CSSAnimationsRegistry> {
 public:
  using SettingsUpdates = std::vector<std::pair<size_t, PartialCSSAnimationSettings>>;

  explicit CSSAnimationsRegistry(const std::shared_ptr<CSSEventsEmitter> &eventsEmitter);

  bool isEmpty() const override;
  bool hasUpdates() const;

  void apply(
      jsi::Runtime &rt,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::optional<std::vector<std::string>> &animationNames,
      const CSSAnimationsMap &newAnimations,
      const CSSAnimationSettingsUpdatesMap &settingsUpdates,
      CSSAnimationEventListeners eventListeners,
      double timestamp);
  void remove(Tag viewTag) override;

  void update(double timestamp);

 private:
  struct AnimationStateSnapshot {
    AnimationProgressState state;
    unsigned iteration;
  };

  using AnimationToIndexMap = std::unordered_map<std::shared_ptr<CSSAnimation>, size_t>;
  using RunningAnimationIndicesMap = std::unordered_map<Tag, std::set<size_t>>;
  using AnimationsToRevertMap = std::unordered_map<Tag, std::unordered_set<size_t>>;
  struct RegistryEntry {
    const CSSAnimationsVector animationsVector;
    const AnimationToIndexMap animationToIndexMap;
  };

  using Registry = std::unordered_map<Tag, RegistryEntry>;

  const std::shared_ptr<CSSEventsEmitter> eventsEmitter_;

  Registry registry_;

  RunningAnimationIndicesMap runningAnimationIndicesMap_;
  AnimationsToRevertMap animationsToRevertMap_;
  DelayedItemsManager<std::shared_ptr<CSSAnimation>> delayedAnimationsManager_;

  std::unordered_map<Tag, CSSAnimationEventListeners> eventListenersMap_;

  CSSAnimationsVector buildAnimationsVector(
      jsi::Runtime &rt,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::optional<std::vector<std::string>> &animationNames,
      const std::optional<CSSAnimationsMap> &newAnimations) const;
  AnimationToIndexMap buildAnimationToIndexMap(const CSSAnimationsVector &animationsVector) const;
  void updateAnimationSettings(
      const CSSAnimationsVector &animationsVector,
      const CSSAnimationSettingsUpdatesMap &settingsUpdates,
      double timestamp);

  void
  updateViewAnimations(Tag viewTag, const std::vector<size_t> &animationIndices, double timestamp, bool addToBatch);
  void
  scheduleOrActivateAnimation(size_t animationIndex, const std::shared_ptr<CSSAnimation> &animation, double timestamp);
  void removeViewAnimations(Tag viewTag);
  void applyViewAnimationsStyle(Tag viewTag, double timestamp);
  void activateDelayedAnimations(double timestamp);
  void handleAnimationsToRevert(double timestamp);

  void scheduleAnimationEvents(
      Tag viewTag,
      const std::shared_ptr<CSSAnimation> &animation,
      const AnimationStateSnapshot &before,
      const AnimationStateSnapshot &after);

  static bool addStyleUpdates(folly::dynamic &target, const folly::dynamic &updates, bool shouldOverride);
};

} // namespace reanimated::css
