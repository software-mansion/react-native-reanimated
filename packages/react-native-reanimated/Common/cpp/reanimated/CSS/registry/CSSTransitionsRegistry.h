#pragma once

#include <reanimated/CSS/core/CSSTransition.h>
#include <reanimated/CSS/registry/StaticPropsRegistry.h>
#include <reanimated/CSS/util/props.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <memory>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

struct DelayedTransition {
  const Tag viewTag;
  double startTimestamp;

  DelayedTransition(Tag viewTag, double startTimestamp)
      : viewTag(viewTag), startTimestamp(startTimestamp) {}
};

struct CompareDelayedTransition {
  bool operator()(
      const std::shared_ptr<DelayedTransition> &lhs,
      const std::shared_ptr<DelayedTransition> &rhs) {
    return lhs->startTimestamp > rhs->startTimestamp;
  }
};

class CSSTransitionsRegistry : public UpdatesRegistry {
 public:
  CSSTransitionsRegistry(
      const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
      const GetAnimationTimestampFunction &getCurrentTimestamp);

  void updateSettings(
      jsi::Runtime &rt,
      Tag viewTag,
      const PartialCSSTransitionSettings &updatedSettings);

  bool hasUpdates() const {
    return !runningTransitionTags_.empty() || !delayedTransitionsMap_.empty();
  }

  void add(const std::shared_ptr<CSSTransition> &transition);
  void remove(Tag viewTag);
  void update(jsi::Runtime &rt, double timestamp);

 private:
  using Registry = std::unordered_map<Tag, std::shared_ptr<CSSTransition>>;
  using DelayedQueue = std::priority_queue<
      std::shared_ptr<DelayedTransition>,
      std::vector<std::shared_ptr<DelayedTransition>>,
      CompareDelayedTransition>;

  const GetAnimationTimestampFunction &getCurrentTimestamp_;
  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;

  Registry registry_;

  std::unordered_set<Tag> runningTransitionTags_;
  std::unordered_map<Tag, std::shared_ptr<DelayedTransition>>
      delayedTransitionsMap_;
  DelayedQueue delayedTransitionsQueue_;

  void activateDelayedTransitions(double timestamp);
  void activateTransition(const std::shared_ptr<CSSTransition> &transition);
  PropsObserver createPropsObserver(Tag viewTag);
};

} // namespace reanimated
