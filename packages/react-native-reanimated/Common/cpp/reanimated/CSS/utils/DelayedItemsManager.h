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
  const double timestamp;
  const TValue value;

  DelayedItem(double timestamp, TValue value);
};

template <typename TValue>
struct DelayedItemComparator {
  bool operator()(const DelayedItem<TValue> &lhs, const DelayedItem<TValue> &rhs) const;
};

template <typename TValue>
class DelayedItemsManager {
  using Item = DelayedItem<TValue>;
  using ItemSet = std::set<Item, DelayedItemComparator<TValue>>;
  using ItemMap = std::unordered_map<TValue, typename ItemSet::iterator>;

  ItemSet itemsSet_;
  ItemMap itemsMap_;

 public:
  void add(double timestamp, const TValue &value);
  Item pop();
  bool remove(const TValue &value);
  bool contains(const TValue &value) const;
  const Item &top() const;
  bool empty() const;
  size_t size() const;
};

} // namespace reanimated::css
