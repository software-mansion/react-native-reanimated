#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

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

class CSSAnimationsRegistry
    : public UpdatesRegistry,
      std::enable_shared_from_this<CSSAnimationsRegistry> {
 public:
  using SettingsUpdates =
      std::vector<std::pair<unsigned, PartialCSSAnimationSettings>>;

  bool hasUpdates() const;

  void set(
      const ShadowNode::Shared &shadowNode,
      std::vector<std::shared_ptr<CSSAnimation>> &&animations,
      double timestamp);
  void remove(Tag viewTag);
  void updateSettings(
      Tag viewTag,
      const SettingsUpdates &settingsUpdates,
      double timestamp);

  void update(double timestamp);

 private:
  using Registry =
      std::unordered_map<Tag, std::vector<std::shared_ptr<CSSAnimation>>>;
  using RunningAnimationsMap = std::unordered_map<Tag, std::set<unsigned>>;
  using AnimationsToRevertMap =
      std::unordered_map<Tag, std::unordered_set<unsigned>>;

  Registry registry_;

  RunningAnimationsMap runningAnimationsMap_;
  AnimationsToRevertMap animationsToRevertMap_;
  DelayedItemsManager<CSSAnimationId> delayedAnimationsManager_;

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
      jsi::Runtime &rt,
      jsi::Object &target,
      const jsi::Value &updates,
      bool override);
  static bool addStyleUpdates(
      folly::dynamic &target,
      const folly::dynamic &updates,
      bool override);
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
