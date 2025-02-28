#pragma once

#include <reanimated/CSS/core/CSSAnimation.h>

#include <set>
#include <stdexcept>
#include <unordered_map>
#include <utility>

#ifndef NDEBUG
#include <iostream>
#endif // NDEBUG

namespace reanimated {

template <typename TIdentifier>
struct DelayedItem {
  const double timestamp;
  const TIdentifier id;

  DelayedItem(double timestamp, TIdentifier id);

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const DelayedItem &item);
#endif // NDEBUG
};

template <typename TIdentifier>
struct DelayedItemComparator {
  bool operator()(
      const DelayedItem<TIdentifier> &lhs,
      const DelayedItem<TIdentifier> &rhs) const;
};

template <typename TIdentifier>
class DelayedItemsManager {
  using Item = DelayedItem<TIdentifier>;
  using ItemSet = std::set<Item, DelayedItemComparator<TIdentifier>>;
  using ItemMap = std::unordered_map<TIdentifier, typename ItemSet::iterator>;

  ItemSet items_;
  ItemMap itemMap_;

 public:
  void add(double timestamp, TIdentifier id);
  Item pop();
  bool remove(const TIdentifier &id);
  const Item &top() const;
  bool empty() const;
  size_t size() const;
};

} // namespace reanimated
