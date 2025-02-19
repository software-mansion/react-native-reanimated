#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/core/CSSTransition.h>
#include <reanimated/CSS/registry/StaticPropsRegistry.h>
#include <reanimated/CSS/util/DelayedItemsManager.h>
#include <reanimated/CSS/util/props.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <memory>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

class CSSTransitionsRegistry
    : public UpdatesRegistry,
      public std::enable_shared_from_this<CSSTransitionsRegistry> {
 public:
  CSSTransitionsRegistry(
      const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
      const GetAnimationTimestampFunction &getCurrentTimestamp);

  bool hasUpdates() const;

  void add(const std::shared_ptr<CSSTransition> &transition);
  void remove(Tag viewTag);
  void removeBatch(const std::vector<Tag>& tagsToRemove) override;
        bool empty();
  void updateSettings(
      jsi::Runtime &rt,
      Tag viewTag,
      const PartialCSSTransitionConfig &config);

  void update(jsi::Runtime &rt, double timestamp);

 private:
  using Registry = std::unordered_map<Tag, std::shared_ptr<CSSTransition>>;

  const GetAnimationTimestampFunction &getCurrentTimestamp_;
  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;

  Registry registry_;

  std::unordered_set<Tag> runningTransitionTags_;
  DelayedItemsManager<Tag> delayedTransitionsManager_;

  void activateDelayedTransitions(double timestamp);
  void scheduleOrActivateTransition(
      const std::shared_ptr<CSSTransition> &transition);
  PropsObserver createPropsObserver(Tag viewTag);
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
