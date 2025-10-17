#include <reanimated/CSS/utils/DelayedItemsManager.h>

namespace reanimated::css {

template <typename TValue>
DelayedItem<TValue>::DelayedItem(const double timestamp, const TValue value)
    : timestamp(timestamp), value(value) {}

template <typename TValue>
bool DelayedItemComparator<TValue>::operator()(
    const DelayedItem<TValue> &lhs,
    const DelayedItem<TValue> &rhs) const {
  if (lhs.timestamp == rhs.timestamp) {
    // Use address comparison as a tiebreaker when timestamps are equal
    return std::less<const TValue *>{}(&lhs.value, &rhs.value);
  }
  return lhs.timestamp < rhs.timestamp;
}

template <typename TValue>
void DelayedItemsManager<TValue>::add(
    const double timestamp,
    const TValue value) {
  auto result = itemsSet_.emplace(timestamp, value);
  if (result.second) {
    itemsMap_[result.first->value] = result.first;
  }
}

template <typename TValue>
typename DelayedItemsManager<TValue>::Item DelayedItemsManager<TValue>::pop() {
  if (itemsSet_.empty()) {
    throw std::runtime_error("[Reanimated] No delayed items available to pop");
  }
  auto it = itemsSet_.begin();
  Item result = std::move(*it);
  itemsMap_.erase(it->value);
  itemsSet_.erase(it);
  return result;
}

template <typename TValue>
bool DelayedItemsManager<TValue>::remove(const TValue value) {
  auto it = itemsMap_.find(value);

  if (it == itemsMap_.end()) {
    return false;
  }

  itemsSet_.erase(it->second);
  itemsMap_.erase(it);
  return true;
}

template <typename TValue>
const typename DelayedItemsManager<TValue>::Item &
DelayedItemsManager<TValue>::top() const {
  if (itemsSet_.empty()) {
    throw std::runtime_error("[Reanimated] No delayed items available");
  }
  return *itemsSet_.begin();
}

template <typename TValue>
bool DelayedItemsManager<TValue>::empty() const {
  return itemsSet_.empty();
}

template <typename TValue>
size_t DelayedItemsManager<TValue>::size() const {
  return itemsSet_.size();
}

// Declare the types that will be used in the DelayedItemsManager class
template class DelayedItemsManager<std::shared_ptr<CSSAnimation>>;
template class DelayedItemsManager<Tag>;

} // namespace reanimated::css
