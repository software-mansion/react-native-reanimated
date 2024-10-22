#pragma once

#include <reanimated/CSS/core/CSSTransition.h>
#include <reanimated/CSS/registry/StaticPropsRegistry.h>
#include <reanimated/CSS/util/props.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <memory>
#include <queue>
#include <utility>

namespace reanimated {

enum class TransitionOperation { ACTIVATE, DEACTIVATE };

class CSSTransitionsRegistry : public UpdatesRegistry {
 public:
  CSSTransitionsRegistry(
      const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
      GetAnimationTimestampFunction &getCurrentTimestamp);

  void updateSettings(
      jsi::Runtime &rt,
      const Tag viewTag,
      const PartialCSSTransitionSettings &updatedSettings);

  bool hasUpdates() const {
    return !runningTransitionTags_.empty() || !delayedTransitionTags_.empty() ||
        !operationsBatch_.empty();
  }

  void add(jsi::Runtime &rt, const std::shared_ptr<CSSTransition> &transition);
  void remove(jsi::Runtime &rt, const Tag viewTag);
  void update(jsi::Runtime &rt, const time_t timestamp);

 private:
  using Registry = std::unordered_map<Tag, std::shared_ptr<CSSTransition>>;
  using OperationsBatch = std::vector<std::pair<TransitionOperation, Tag>>;
  using DelayedQueue = std::priority_queue<
      std::pair<time_t, Tag>,
      std::vector<std::pair<time_t, Tag>>,
      std::greater<std::pair<time_t, Tag>>>;

  const GetAnimationTimestampFunction &getCurrentTimestamp_;
  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;

  Registry registry_;
  OperationsBatch operationsBatch_;

  std::unordered_set<Tag> runningTransitionTags_;
  std::unordered_set<Tag> delayedTransitionTags_;
  DelayedQueue delayedTransitionsQueue_;

  void activateDelayedTransitions(const time_t timestamp);
  void flushOperations();

  jsi::Value handleUpdate(
      jsi::Runtime &rt,
      const time_t timestamp,
      const std::shared_ptr<CSSTransition> &transition);
  void handleOperation(const TransitionOperation operation, const Tag viewTag);

  PropsObserver createPropsObserver(const Tag viewTag);
};

} // namespace reanimated
