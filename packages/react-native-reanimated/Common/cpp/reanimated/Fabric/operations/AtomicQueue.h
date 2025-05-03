#pragma once

#include <atomic>
#include <memory>
#include <vector>

namespace reanimated {

template <typename T>
class AtomicQueue {
 private:
  struct Node {
    std::unique_ptr<T> data;
    std::atomic<Node *> next;

    explicit Node(T &&value) noexcept
        : data(std::make_unique<T>(std::move(value))), next(nullptr) {}

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

  void enqueue(T value) {
    Node *newNode = new Node(std::move(value));
    Node *prevTail = tail_.exchange(newNode, std::memory_order_acq_rel);
    prevTail->next.store(newNode, std::memory_order_release);
  }

  std::vector<T> dequeueAll() {
    // Exchange the head pointer with a new dummy node to ensure that new
    // nodes aren't added to the currently dequeued nodes batch
    Node *newDummy = new Node();
    Node *detachedHead = head_.exchange(newDummy, std::memory_order_acq_rel);

    std::vector<T> items;
    Node *current = detachedHead->next.load(std::memory_order_acquire);

    // Iterate over the detached nodes queue and store their data in the items
    // vector
    while (current) {
      items.emplace_back(std::move(*current->data));
      Node *temp = current;
      current = current->next.load(std::memory_order_acquire);
      delete temp;
    }

    delete detachedHead; // delete the old dummy node

    return items;
  }
};

} // namespace reanimated
