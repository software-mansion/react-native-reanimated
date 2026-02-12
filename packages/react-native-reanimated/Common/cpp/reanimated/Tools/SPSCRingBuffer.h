#pragma once

#include <glog/logging.h>
#include <atomic>
#include <cstddef>
#include <cstdint>
#include <thread>
#include <type_traits>
#include <utility>

namespace reanimated {

namespace detail {
constexpr size_t nextPowerOf2(size_t n) {
  if (n == 0)
    return 1;
  n--;
  n |= n >> 1;
  n |= n >> 2;
  n |= n >> 4;
  n |= n >> 8;
  n |= n >> 16;
  n |= n >> 32;
  return n + 1;
}
} // namespace detail

/**
 * Single-Producer Single-Consumer (SPSC) Lock-Free Ring Buffer
 *
 * Wait-free push for the producer thread (profiler).
 * Consumer (network thread) drains events.
 *
 * Features:
 * - Lock-free operations
 * - Cache-line aligned to prevent false sharing
 * - Compile-time power-of-2 capacity for efficient modulo via bitmask
 * - No dynamic allocation - buffer is inline
 *
 * Template parameters:
 * - T: Element type (must be trivially destructible)
 * - Capacity: Requested capacity (will be rounded up to next power of 2)
 */
template <typename T, size_t Capacity>
class SPSCRingBuffer {
  static_assert(std::is_trivially_destructible<T>::value, "SPSCRingBuffer only supports trivially destructible types");

  static constexpr size_t ActualCapacity = detail::nextPowerOf2(Capacity);
  static constexpr size_t Mask = ActualCapacity - 1;

 public:
  SPSCRingBuffer() : head_(0), tail_(0) {}

  // Push an item (producer thread only)
  void push(T &&item) {
    const size_t currentHead = head_.load(std::memory_order_relaxed);
    const size_t nextHead = (currentHead + 1) & Mask;

    // Check if full
    if (nextHead == tail_.load(std::memory_order_acquire)) {
      //buffer is full, block
      while (nextHead == tail_.load(std::memory_order_acquire)) {
        LOG(INFO) << "SPSCRingBuffer is full, producer is waiting...";
        std::this_thread::yield();
      }
    }

    // Write item
    buffer_[currentHead] = std::move(item);

    // Update head
    head_.store(nextHead, std::memory_order_release);
  }

  // Convenience overload for const ref
  void push(const T &item) {
    push(T(item));
  }

  bool empty() const {
    return head_.load(std::memory_order_acquire) == tail_.load(std::memory_order_acquire);
  }

  static constexpr size_t capacity() {
    return ActualCapacity;
  }

  size_t drainBounded(std::vector<T> &events) {
    // Snapshot head at start - only drain up to this point
    const size_t snapshotHead = head_.load(std::memory_order_acquire);
    const size_t currentTail = tail_.load(std::memory_order_relaxed);

    // Calculate count
    const size_t count = (snapshotHead - currentTail) & Mask;

    // Read all items directly (single consumer, no need to update tail
    // incrementally)
    for (size_t i = 0; i < count; ++i) {
      events.push_back(buffer_[(currentTail + i) & Mask]);
    }

    // Update tail once at the end
    tail_.store(snapshotHead, std::memory_order_release);

    return count;
  }

 private:
  T buffer_[ActualCapacity];

  // Align head and tail to separate cache lines to prevent false sharing
  alignas(64) std::atomic<size_t> head_;
  alignas(64) std::atomic<size_t> tail_;
};

} // namespace reanimated
