#include <reanimated/CSS/registry/CSSRegistry.h>

namespace reanimated {

template <typename Item, typename Operation>
bool CSSRegistry<Item, Operation>::hasUpdates() const {
  return !runningIds_.empty() || !delayedIds_.empty();
}

template <typename Item, typename Operation>
void CSSRegistry<Item, Operation>::update(
    jsi::Runtime &rt,
    const time_t timestamp) {
  // Activate all delayed items that should start now
  activateDelayedItems(timestamp);
  // Flush all operations from the batch
  flushOperations(rt, timestamp);

  // Iterate over active items and update them
  for (const auto &id : runningIds_) {
    const auto itemOptional = getItem(id);
    if (!itemOptional.has_value()) {
      continue;
    }
    const auto item = itemOptional.value();

    const jsi::Value &updates = handleUpdate(rt, timestamp, item);
    if (updates.isUndefined()) {
      operationsBatch_.emplace_back(Operation::DEACTIVATE, id);
    } else {
      updatesBatch_.emplace_back(
          item->getShadowNode(), std::make_unique<jsi::Value>(rt, updates));
    }
  }
}

template <typename Item, typename Operation>
void CSSRegistry<Item, Operation>::updateSettings(
    jsi::Runtime &rt,
    const unsigned id,
    const typename Item::PartialSettings &updatedSettings,
    const time_t timestamp) {
  const auto itemOptional = getItem(id);
  if (!itemOptional.has_value()) {
    return;
  }
  const auto &item = itemOptional.value();
  item->updateSettings(rt, updatedSettings, timestamp);

  operationsBatch_.emplace_back(Operation::ACTIVATE, id);
}

template <typename Item, typename Operation>
inline std::optional<std::shared_ptr<Item>>
CSSRegistry<Item, Operation>::getItem(const unsigned id) {
  const auto &it = registry_.find(id);
  if (it == registry_.end()) {
    operationsBatch_.emplace_back(Operation::REMOVE, id);
    return std::nullopt;
  }
  return it->second;
}

template <typename Item, typename Operation>
void CSSRegistry<Item, Operation>::activateDelayedItems(
    const time_t timestamp) {
  while (!delayedItemsQueue_.empty() &&
         delayedItemsQueue_.top().first <= timestamp) {
    const auto [_, id] = delayedItemsQueue_.top();
    delayedItemsQueue_.pop();
    delayedIds_.erase(id);
    runningIds_.insert(id);
    operationsBatch_.emplace_back(Operation::ACTIVATE, id);
  }
}

template <typename Item, typename Operation>
void CSSRegistry<Item, Operation>::flushOperations(
    jsi::Runtime &rt,
    const time_t timestamp) {
  auto copiedOperationsBatch = std::move(operationsBatch_);
  operationsBatch_.clear();

  for (const auto &[operation, id] : copiedOperationsBatch) {
    const auto itemOptional = getItem(id);
    if (!itemOptional.has_value()) {
      continue;
    }
    const auto item = itemOptional.value();

    handleOperation(rt, operation, item, timestamp);
  }
}

// Declare the types that will be used in the CSSRegistry class
template class CSSRegistry<CSSAnimation, AnimationOperation>;
template class CSSRegistry<CSSTransition, TransitionOperation>;

} // namespace reanimated
