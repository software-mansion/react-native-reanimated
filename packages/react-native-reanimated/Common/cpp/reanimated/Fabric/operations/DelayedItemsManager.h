#pragma once

#include <functional>
#include <memory>
#include <set>
#include <stdexcept>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

template <typename TValue>
struct DelayedItem {
  double timestamp;
  TValue value;

  template <typename T>
  DelayedItem(double timestamp, T &&value)
      : timestamp(timestamp), value(std::forward<T>(value)) {}
};

template <typename TValue>
struct DelayedItemComparator {
  bool operator()(
      const DelayedItem<TValue> &lhs,
      const DelayedItem<TValue> &rhs) const {
    if (lhs.timestamp == rhs.timestamp) {
      // This just ensures that set treats items as distinct when timestamps are
      // equal and doesn't remove one of them.
      return std::less<const TValue *>{}(
          std::addressof(lhs.value), std::addressof(rhs.value));
    }
    return lhs.timestamp < rhs.timestamp;
  }
};

template <typename TValue>
class DelayedItemsManager {
  using Item = DelayedItem<TValue>;
  using ItemSet = std::set<Item, DelayedItemComparator<TValue>>;
  using ItemMap = std::unordered_map<TValue, typename ItemSet::iterator>;

  ItemSet itemsSet_;
  ItemMap itemsMap_;

 public:
  template <typename T>
  void add(double timestamp, T &&value) {
    auto [it, inserted] = itemsSet_.emplace(timestamp, std::forward<T>(value));
    if (inserted) {
      itemsMap_[it->value] = it;
    }
  }

  Item pop() {
    if (itemsSet_.empty()) {
      throw std::runtime_error(
          "[Reanimated] No delayed items available to pop");
    }
    auto it = itemsSet_.begin();
    Item result{it->timestamp, std::move(const_cast<TValue &>(it->value))};
    itemsMap_.erase(it->value);
    itemsSet_.erase(it);
    return result;
  }

  bool remove(const TValue &value) {
    auto it = itemsMap_.find(value);
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

} // namespace reanimated::css
