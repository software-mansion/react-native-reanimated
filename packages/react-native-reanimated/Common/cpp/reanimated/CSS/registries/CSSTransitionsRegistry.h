#pragma once

#include <reanimated/CSS/core/CSSTransition.h>
#include <reanimated/CSS/utils/DelayedItemsManager.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <memory>
#include <unordered_map>
#include <unordered_set>

namespace reanimated::css {

class CSSTransitionsRegistry : public UpdatesRegistry {
 public:
  explicit CSSTransitionsRegistry(const GetAnimationTimestampFunction &getCurrentTimestamp);

  bool isEmpty() const override;
  bool hasUpdates() const;

  void
  add(jsi::Runtime &rt, std::shared_ptr<CSSTransition> transition, const CSSTransitionPropertyUpdates &propertyUpdates);
  void update(jsi::Runtime &rt, Tag viewTag, const CSSTransitionUpdates &updates);
  void remove(Tag viewTag) override;

  void update(double timestamp);

 private:
  using Registry = std::unordered_map<Tag, std::shared_ptr<CSSTransition>>;

  const GetAnimationTimestampFunction &getCurrentTimestamp_;
  Registry registry_;

  std::unordered_set<Tag> runningTransitionTags_;
  DelayedItemsManager<Tag> delayedTransitionsManager_;

  void activateDelayedTransitions(double timestamp);
  void scheduleOrActivateTransition(const std::shared_ptr<CSSTransition> &transition);
  void runTransition(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSTransition> &transition,
      const CSSTransitionPropertyUpdates &propertyUpdates);
  void updateInUpdatesRegistry(const std::shared_ptr<CSSTransition> &transition, const folly::dynamic &updates);
};

} // namespace reanimated::css
