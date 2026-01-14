#pragma once

#include <reanimated/CSS/core/CSSTransition.h>
#include <reanimated/CSS/registries/StaticPropsRegistry.h>
#include <reanimated/CSS/utils/DelayedItemsManager.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <memory>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated::css {

class CSSTransitionsRegistry : public UpdatesRegistry, public std::enable_shared_from_this<CSSTransitionsRegistry> {
 public:
  CSSTransitionsRegistry(const GetAnimationTimestampFunction &getCurrentTimestamp);

  bool isEmpty() const override;
  bool hasUpdates() const;

  void run(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const ChangedProps &changedProps,
      const CSSTransitionPropertiesSettings &settings,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);
  void remove(Tag viewTag) override;

  void update(double timestamp);

 private:
  using Registry = std::unordered_map<Tag, std::shared_ptr<CSSTransition>>;

  const GetAnimationTimestampFunction &getCurrentTimestamp_;

  Registry registry_;

  std::unordered_set<Tag> runningTransitionTags_;
  DelayedItemsManager<Tag> delayedTransitionsManager_;

  std::shared_ptr<CSSTransition> getOrCreateTransition(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);
  void activateDelayedTransitions(double timestamp);
  void scheduleOrActivateTransition(const std::shared_ptr<CSSTransition> &transition);
};

} // namespace reanimated::css
