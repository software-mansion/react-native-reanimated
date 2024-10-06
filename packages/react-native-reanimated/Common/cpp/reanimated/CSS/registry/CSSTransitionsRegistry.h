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

enum class TransitionOperation { REMOVE, ACTIVATE, DEACTIVATE };

class CSSTransitionsRegistry : public UpdatesRegistry {
 public:
  CSSTransitionsRegistry(
      const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
      GetAnimationTimestampFunction &getCurrentTimestamp);

  void updateSettings(
      jsi::Runtime &rt,
      const unsigned id,
      const PartialCSSTransitionSettings &updatedSettings);

  bool hasUpdates() const {
    return !runningTransitionIds_.empty() || !delayedTransitionIds_.empty() ||
        !operationsBatch_.empty();
  }

  void add(const std::shared_ptr<CSSTransition> &transition);
  void remove(const unsigned id);
  void update(jsi::Runtime &rt, const time_t timestamp);

 private:
  using Registry = std::unordered_map<unsigned, std::shared_ptr<CSSTransition>>;
  using OperationsBatch = std::vector<std::pair<TransitionOperation, unsigned>>;
  using DelayedQueue = std::priority_queue<
      std::pair<time_t, unsigned>,
      std::vector<std::pair<time_t, unsigned>>,
      std::greater<std::pair<time_t, unsigned>>>;

  const GetAnimationTimestampFunction &getCurrentTimestamp_;
  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;

  Registry registry_;
  OperationsBatch operationsBatch_;

  std::unordered_set<unsigned> runningTransitionIds_;
  std::unordered_set<unsigned> delayedTransitionIds_;
  DelayedQueue delayedTransitionsQueue_;

  void activateDelayedTransitions(const time_t timestamp);
  void flushOperations(jsi::Runtime &rt, const time_t timestamp);

  jsi::Value handleUpdate(
      jsi::Runtime &rt,
      const time_t timestamp,
      const std::shared_ptr<CSSTransition> &transition);
  void handleOperation(
      jsi::Runtime &rt,
      const TransitionOperation operation,
      const std::shared_ptr<CSSTransition> &transition,
      const time_t timestamp);

  void removeOperation(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSTransition> &transition);
  void activateOperation(const unsigned id);
  void deactivateOperation(
      const std::shared_ptr<CSSTransition> &transition,
      const time_t timestamp);

  PropsObserver createPropsObserver(const unsigned id);
};

} // namespace reanimated
