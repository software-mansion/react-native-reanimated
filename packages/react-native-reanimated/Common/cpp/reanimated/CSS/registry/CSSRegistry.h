#pragma once

#include <reanimated/CSS/CSSAnimation.h>
#include <reanimated/CSS/CSSTransition.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <memory>
#include <queue>
#include <utility>

namespace reanimated {

enum class AnimationOperation { ADD, REMOVE, ACTIVATE, DEACTIVATE, FINISH };
enum class TransitionOperation { ADD, REMOVE, ACTIVATE, DEACTIVATE };

template <typename Item, typename Operation>
class CSSRegistry : public UpdatesRegistry {
 public:
  bool hasUpdates() const;

  void add(const std::shared_ptr<Item> &item);
  void remove(const unsigned id);
  void update(jsi::Runtime &rt, const time_t timestamp);

  void updateSettings(
      jsi::Runtime &rt,
      const unsigned id,
      const typename Item::PartialSettings &updatedSettings,
      const time_t timestamp);

 protected:
  using Registry = std::unordered_map<unsigned, std::shared_ptr<Item>>;
  using OperationsBatch = std::vector<std::pair<Operation, unsigned>>;
  using DelayedQueue = std::priority_queue<
      std::pair<time_t, unsigned>,
      std::vector<std::pair<time_t, unsigned>>,
      std::greater<std::pair<time_t, unsigned>>>;

  Registry registry_;
  OperationsBatch operationsBatch_;

  std::unordered_set<unsigned> runningIds_;
  DelayedQueue delayedIds_;

  virtual jsi::Value handleUpdate(
      jsi::Runtime &rt,
      const time_t timestamp,
      const std::shared_ptr<Item> &item) = 0;
  virtual void handleOperation(
      jsi::Runtime &rt,
      const Operation operation,
      const std::shared_ptr<Item> &item,
      const time_t timestamp) = 0;

  virtual void addOperation(
      jsi::Runtime &rt,
      const std::shared_ptr<Item> &item,
      const time_t timestamp) = 0;
  virtual void removeOperation(
      jsi::Runtime &rt,
      const std::shared_ptr<Item> &item) = 0;
  virtual void activateOperation(const unsigned id) = 0;
  virtual void deactivateOperation(
      const std::shared_ptr<Item> &item,
      const time_t timestamp) = 0;

 private:
  void activateDelayedItems(const time_t timestamp);
  void flushOperations(jsi::Runtime &rt, const time_t timestamp);

  inline std::optional<std::shared_ptr<Item>> getItem(const unsigned id);
};

} // namespace reanimated
