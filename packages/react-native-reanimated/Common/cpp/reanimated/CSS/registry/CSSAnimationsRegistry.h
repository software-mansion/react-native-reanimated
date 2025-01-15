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

class CSSAnimationsRegistry : public UpdatesRegistry {
 public:
  using SettingsUpdates =
      std::vector<std::pair<unsigned, PartialCSSAnimationSettings>>;

  bool hasUpdates() const;

  void set(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      std::vector<std::shared_ptr<CSSAnimation>> &&animations,
      double timestamp);
  void remove(Tag viewTag);
  void updateSettings(
      jsi::Runtime &rt,
      Tag viewTag,
      const SettingsUpdates &settingsUpdates,
      double timestamp);

  void update(jsi::Runtime &rt, double timestamp);

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
      jsi::Runtime &rt,
      Tag viewTag,
      const std::vector<unsigned> &animationIndices,
      double timestamp,
      bool addToBatch);
  void scheduleOrActivateAnimation(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSAnimation> &animation,
      double timestamp);
  void removeViewAnimations(Tag viewTag);
  void
  applyViewAnimationsStyle(jsi::Runtime &rt, Tag viewTag, double timestamp);
  void activateDelayedAnimations(double timestamp);
  void handleAnimationsToRevert(jsi::Runtime &rt, double timestamp);

  static bool addStyleUpdates(
      jsi::Runtime &rt,
      jsi::Object &target,
      const jsi::Value &updates,
      bool override);
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
