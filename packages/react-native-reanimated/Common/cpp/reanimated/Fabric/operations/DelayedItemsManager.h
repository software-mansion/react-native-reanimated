#pragma once

#include <functional>
#include <memory>
#include <set>
#include <stdexcept>
#include <unordered_map>
#include <utility>

namespace reanimated {

template <typename TId, typename TValue = TId>
struct DelayedItem {
  double timestamp;
  TId id;
  TValue value;

  DelayedItem(double timestamp, TId id, TValue value)
      : timestamp(timestamp), id(std::move(id)), value(std::move(value)) {}
};

template <typename TId, typename TValue = TId>
struct DelayedItemComparator {
  bool operator()(
      const DelayedItem<TId, TValue> &lhs,
      const DelayedItem<TId, TValue> &rhs) const noexcept {
    if (lhs.timestamp != rhs.timestamp) {
      return lhs.timestamp < rhs.timestamp;
    }

    return std::less<const void *>()(
        std::addressof(lhs.id), std::addressof(rhs.id));
  }
};

// Allow specifying just TId (for cases when value is used as id)
template <typename TId, typename TValue = TId>
class DelayedItemsManager {
  using Item = DelayedItem<TId, TValue>;
  using ItemSet = std::set<Item, DelayedItemComparator<TId, TValue>>;
  using ItemMap = std::unordered_map<TId, typename ItemSet::iterator>;

  ItemSet itemsSet_;
  ItemMap itemsMap_;

 public:
  DelayedItemsManager() noexcept = default;
  DelayedItemsManager(DelayedItemsManager &&) noexcept = default;
  DelayedItemsManager &operator=(DelayedItemsManager &&) noexcept = default;

  DelayedItemsManager(const DelayedItemsManager &) = delete;
  DelayedItemsManager &operator=(const DelayedItemsManager &) = delete;

  void add(double timestamp, TId id, TValue value) {
    auto [it, inserted] =
        itemsSet_.emplace(timestamp, std::move(id), std::move(value));
    if (inserted) {
      itemsMap_.emplace(it->id, it);
    }
  }

  // Overloaded add method (timestamp, value) when TId and TValue are same
  void add(double timestamp, TValue value) {
    static_assert(
        std::is_same_v<TId, TValue>,
        "Single-argument add() is only available when TId and TValue are the same type");
    add(timestamp, std::move(value), std::move(value));
  }

  Item pop() {
    if (itemsSet_.empty()) {
      throw std::runtime_error(
          "[Reanimated] No delayed items available to pop");
    }

    auto node = itemsSet_.extract(itemsSet_.begin());
    itemsMap_.erase(node.value().id);
    return std::move(node.value());
  }

  bool remove(const TId &id) noexcept {
    auto it = itemsMap_.find(id);
    if (it == itemsMap_.end()) {
      return false;
    }

    itemsSet_.erase(it->second);
    itemsMap_.erase(it);
    return true;
  }

  const Item &top() const {
    if (itemsSet_.empty()) {
      throw std::runtime_error("[Reanimated] No delayed items available");
    }
    return *itemsSet_.begin();
  }

  bool empty() const noexcept {
    return itemsSet_.empty();
  }

  size_t size() const noexcept {
    return itemsSet_.size();
  }
};

} // namespace reanimated
