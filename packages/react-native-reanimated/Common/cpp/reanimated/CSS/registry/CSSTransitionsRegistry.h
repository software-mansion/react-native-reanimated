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

struct DelayedTransition {
  const Tag viewTag;
  double startTimestamp;

  DelayedTransition(const Tag viewTag, const double startTimestamp)
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
      GetAnimationTimestampFunction &getCurrentTimestamp);

  void updateSettings(
      jsi::Runtime &rt,
      const Tag viewTag,
      const PartialCSSTransitionSettings &updatedSettings);

  bool hasUpdates() const {
    return !runningTransitionTags_.empty() || !delayedTransitionsMap_.empty() ||
        !operationsBatch_.empty();
  }

  void add(jsi::Runtime &rt, const std::shared_ptr<CSSTransition> &transition);
  void remove(jsi::Runtime &rt, const Tag viewTag);
  void update(jsi::Runtime &rt, const time_t timestamp);

 private:
  using Registry = std::unordered_map<Tag, std::shared_ptr<CSSTransition>>;
  using OperationsBatch = std::vector<std::pair<TransitionOperation, Tag>>;
  using DelayedQueue = std::priority_queue<
      std::shared_ptr<DelayedTransition>,
      std::vector<std::shared_ptr<DelayedTransition>>,
      CompareDelayedTransition>;

  const GetAnimationTimestampFunction &getCurrentTimestamp_;
  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;

  Registry registry_;
  OperationsBatch operationsBatch_;

  std::unordered_set<Tag> runningTransitionTags_;
  std::unordered_map<Tag, std::shared_ptr<DelayedTransition>>
      delayedTransitionsMap_;
  DelayedQueue delayedTransitionsQueue_;

  void activateDelayedTransitions(const time_t timestamp);
  void flushOperations();

  jsi::Value handleUpdate(
      jsi::Runtime &rt,
      const time_t timestamp,
      const std::shared_ptr<CSSTransition> &transition);
  void handleOperation(const TransitionOperation operation, const Tag viewTag);

  void activateOperation(const Tag viewTag);
  void deactivateOperation(const Tag viewTag);

  PropsObserver createPropsObserver(const Tag viewTag);
};

} // namespace reanimated
