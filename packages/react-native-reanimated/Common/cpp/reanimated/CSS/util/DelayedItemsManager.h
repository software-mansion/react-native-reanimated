#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/core/CSSAnimation.h>

#include <iostream>
#include <set>
#include <stdexcept>
#include <unordered_map>
#include <utility>

namespace reanimated {

template <typename Identifier>
struct DelayedItem {
  const double timestamp;
  const Identifier id;

  DelayedItem(double timestamp, Identifier id) : timestamp(timestamp), id(id) {}

  friend std::ostream &operator<<(std::ostream &os, const DelayedItem &item) {
    os << "DelayedItem(" << item.timestamp << ", " << item.id << ")";
    return os;
  }
};

template <typename Identifier>
struct DelayedItemComparator {
  bool operator()(
      const DelayedItem<Identifier> &lhs,
      const DelayedItem<Identifier> &rhs) const {
    if (lhs.timestamp != rhs.timestamp) {
      return lhs.timestamp < rhs.timestamp;
    }
    return lhs.id < rhs.id;
  }
};

template <typename Identifier>
class DelayedItemsManager {
  using Item = DelayedItem<Identifier>;
  using ItemSet = std::set<Item, DelayedItemComparator<Identifier>>;
  using ItemMap = std::unordered_map<Identifier, typename ItemSet::iterator>;

  ItemSet items_;
  ItemMap itemMap_;

 public:
  void add(double timestamp, Identifier id);
  Item pop();
  bool remove(const Identifier &id);
  const Item &top() const;
  bool empty() const;
  size_t size() const;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
