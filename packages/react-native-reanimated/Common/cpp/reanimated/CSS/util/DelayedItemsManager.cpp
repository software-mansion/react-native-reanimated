#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/util/DelayedItemsManager.h>

namespace reanimated {

template <typename TIdentifier>
DelayedItem<TIdentifier>::DelayedItem(double timestamp, TIdentifier id)
    : timestamp(timestamp), id(id) {}

#ifndef NDEBUG

template <typename TIdentifier>
std::ostream &operator<<(
    std::ostream &os,
    const DelayedItem<TIdentifier> &item) {
  os << "DelayedItem(" << item.timestamp << ", " << item.id << ")";
  return os;
}

#endif // NDEBUG

template <typename TIdentifier>
bool DelayedItemComparator<TIdentifier>::operator()(
    const DelayedItem<TIdentifier> &lhs,
    const DelayedItem<TIdentifier> &rhs) const {
  if (lhs.timestamp != rhs.timestamp) {
    return lhs.timestamp < rhs.timestamp;
  }
  return lhs.id < rhs.id;
}

template <typename TIdentifier>
void DelayedItemsManager<TIdentifier>::add(
    const double timestamp,
    const TIdentifier id) {
  auto result = items_.emplace(timestamp, id);
  if (result.second) {
    itemMap_[result.first->id] = result.first;
  }
}

template <typename TIdentifier>
typename DelayedItemsManager<TIdentifier>::Item
DelayedItemsManager<TIdentifier>::pop() {
  if (items_.empty()) {
    throw std::runtime_error("[Reanimated] No delayed items available to pop");
  }
  auto it = items_.begin();
  Item result = std::move(*it);
  itemMap_.erase(it->id);
  items_.erase(it);
  return result;
}

template <typename TIdentifier>
bool DelayedItemsManager<TIdentifier>::remove(const TIdentifier &id) {
  auto mapIt = itemMap_.find(id);
  if (mapIt != itemMap_.end()) {
    items_.erase(mapIt->second);
    itemMap_.erase(mapIt);
    return true;
  }
  return false;
}

template <typename TIdentifier>
const typename DelayedItemsManager<TIdentifier>::Item &
DelayedItemsManager<TIdentifier>::top() const {
  if (items_.empty()) {
    throw std::runtime_error("[Reanimated] No delayed items available");
  }
  return *items_.begin();
}

template <typename TIdentifier>
bool DelayedItemsManager<TIdentifier>::empty() const {
  return items_.empty();
}

template <typename TIdentifier>
size_t DelayedItemsManager<TIdentifier>::size() const {
  return items_.size();
}

// Declare the types that will be used in the DelayedItemsManager class
template class DelayedItemsManager<CSSAnimationId>;
template class DelayedItemsManager<Tag>;
template struct DelayedItem<CSSAnimationId>;
template struct DelayedItem<Tag>;
template struct DelayedItemComparator<CSSAnimationId>;
template struct DelayedItemComparator<Tag>;

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
