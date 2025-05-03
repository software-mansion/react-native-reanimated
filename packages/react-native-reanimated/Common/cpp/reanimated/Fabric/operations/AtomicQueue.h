#pragma once

#include <atomic>
#include <memory>
#include <vector>

namespace reanimated {

template <typename TItem>
class AtomicQueue {
 private:
  struct Node {
    std::unique_ptr<TItem> data;
    std::atomic<Node *> next;

    explicit Node(TItem &&value) noexcept
        : data(std::make_unique<TItem>(std::move(value))), next(nullptr) {}

    Node() noexcept : next(nullptr) {} // Dummy node
  };

  std::atomic<Node *> head_;
  std::atomic<Node *> tail_;

 public:
  AtomicQueue() noexcept {
    auto dummy = new Node();
    head_.store(dummy, std::memory_order_relaxed);
    tail_.store(dummy, std::memory_order_relaxed);
  }

  ~AtomicQueue() noexcept {
    Node *node = head_.load(std::memory_order_acquire);
    while (node) {
      Node *next = node->next.load(std::memory_order_acquire);
      delete node;
      node = next;
    }
  }

  // Prevent copying
  AtomicQueue(const AtomicQueue &) = delete;
  AtomicQueue &operator=(const AtomicQueue &) = delete;

  void enqueue(TItem value) {
    Node *newNode = new Node(std::move(value));
    Node *prevTail = tail_.exchange(newNode, std::memory_order_acq_rel);
    prevTail->next.store(newNode, std::memory_order_release);
  }

  std::vector<TItem> dequeueAll() {
    Node *newDummy = new Node();

    Node *oldTail = tail_.exchange(newDummy, std::memory_order_acq_rel);
    Node *oldHead = head_.exchange(newDummy, std::memory_order_acq_rel);

    std::vector<TItem> items;
    Node *current = oldHead->next.load(std::memory_order_acquire);

    while (current) {
      items.emplace_back(std::move(*current->data));
      Node *temp = current;
      current = current->next.load(std::memory_order_acquire);
      delete temp;
    }

    // Delete the detached dummy node
    delete oldHead;

    return items;
  }
};

} // namespace reanimated
