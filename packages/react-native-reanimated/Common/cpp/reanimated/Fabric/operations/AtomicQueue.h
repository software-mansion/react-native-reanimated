#pragma once

#include <atomic>
#include <memory>
#include <vector>

namespace reanimated {

template <typename TItem>
class AtomicQueue {
 private:
  struct Node {
    std::shared_ptr<TItem> data;
    std::shared_ptr<Node> next;

    explicit Node(TItem &&value)
        : data(std::make_shared<TItem>(std::move(value))), next(nullptr) {}

    Node() : next(nullptr) {} // Dummy node
  };

  std::atomic<Node *> head_;
  std::atomic<Node *> tail_;

 public:
  AtomicQueue() {
    auto dummy = new Node();
    head_.store(dummy, std::memory_order_relaxed);
    tail_.store(dummy, std::memory_order_relaxed);
  }

  ~AtomicQueue() {
    // Clean up all nodes
    Node *node = head_.load();
    while (node) {
      Node *next = node->next ? node->next.get() : nullptr;
      delete node;
      node = next;
    }
  }

  // Prevent copying
  AtomicQueue(const AtomicQueue &) = delete;
  AtomicQueue &operator=(const AtomicQueue &) = delete;

  void enqueue(TItem value) {
    auto newNode = new Node(std::move(value));
    auto prevTail = tail_.exchange(newNode, std::memory_order_acq_rel);
    prevTail->next = std::shared_ptr<Node>(newNode);
  }

  std::vector<TItem> dequeueAll() {
    // Update the tail first to ensure that all enqueued operations during the
    // dequeueAll handling are added to the new queue and won't be included in
    // the currently dequeued batch
    auto newDummy = new Node();
    tail_.exchange(newDummy, std::memory_order_acq_rel);

    // Exchange the head to get the current batch
    auto oldHead = head_.exchange(newDummy, std::memory_order_acq_rel);

    // Dequeue all items into a vector
    std::vector<TItem> items;
    auto current = oldHead->next;
    while (current) {
      items.emplace_back(std::move(*current->data));
      current = current->next;
    }

    delete oldHead; // Clean up dummy node

    return items;
  }
};

} // namespace reanimated
