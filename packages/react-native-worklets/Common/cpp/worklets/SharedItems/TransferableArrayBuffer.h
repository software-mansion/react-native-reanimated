#pragma once

#include <jsi/jsi.h>

#include <atomic>
#include <cstdint>
#include <memory>
// #include <mutex>
#include <utility>
#include <vector>

using namespace facebook;

namespace worklets {

// Owns the bytes of a transferable array buffer. It is a `jsi::MutableBuffer`,
// so it can back a *real* `jsi::ArrayBuffer` (native-speed typed arrays) instead
// of a HostObject view. The instance is shared (by `shared_ptr`) between every
// runtime that materializes it, so passing it across runtimes never copies the
// bytes - each runtime wraps the same store in its own `jsi::ArrayBuffer`.
class TransferableArrayBuffer : public jsi::MutableBuffer {
 public:
  explicit TransferableArrayBuffer(size_t size) : data_(size, 0) {}
  explicit TransferableArrayBuffer(std::vector<uint8_t> &&data) : data_(std::move(data)) {}

  size_t size() const override {
    return data_.size();
  }

  uint8_t *data() override {
    return data_.data();
  }

  // Moves the bytes out into a fresh store (resized to `newByteLength`), leaving
  // this store empty. The caller MUST detach every `jsi::ArrayBuffer` that wraps
  // this store before any JS touches it again - their cached data pointer is now
  // dangling. See `detachArrayBufferInPlace`.
  std::shared_ptr<TransferableArrayBuffer> transfer(size_t newByteLength) {
    auto fresh = std::make_shared<TransferableArrayBuffer>(std::move(data_));
    fresh->data_.resize(newByteLength, 0);
    data_.clear();
    data_.shrink_to_fit();
    return fresh;
  }

  // Records the raw address of a JS `ArrayBuffer` cell that wraps this store.
  // Cells from different runtimes accumulate here (the store is shared by
  // `shared_ptr`), so a transfer from ANY runtime can detach them all by raw
  // memory write - no per-runtime scheduling or thread hop. Stored as plain
  // addresses because a `jsi::WeakObject` can only be locked on its own thread.
  void registerOwnerCell(void *cell) {
    // std::lock_guard<std::mutex> lock(ownerCellsMutex_);
    ownerCells_.push_back(cell);
  }

  // Returns and clears the recorded owner cells (used by transfer() to detach
  // every wrapper of this store across all runtimes).
  std::vector<void *> takeOwnerCells() {
    // std::lock_guard<std::mutex> lock(ownerCellsMutex_);
    return std::move(ownerCells_);
  }

  // `detached` is a single C++ flag on the SHARED store, so a transfer() in any
  // runtime makes `buf.detached` read true in every runtime (the getter on each
  // wrapper reads this same flag). Atomic for cross-thread visibility.
  bool detached() const {
    return detached_.load(std::memory_order_acquire);
  }

  void markDetached() {
    detached_.store(true, std::memory_order_release);
  }

 private:
  std::vector<uint8_t> data_;
  std::vector<void *> ownerCells_;
  // std::mutex ownerCellsMutex_;
  std::atomic<bool> detached_{false};
};

// Attached to the JS-facing `jsi::ArrayBuffer` so the C++ store can be recovered
// later. RN 0.85's JSI has no `tryGetMutableBuffer`, so we cannot ask Hermes for
// the `MutableBuffer` it retained - we keep our own readable handle here.
class TransferableArrayBufferState : public jsi::NativeState {
 public:
  explicit TransferableArrayBufferState(std::shared_ptr<TransferableArrayBuffer> buffer)
      : buffer(std::move(buffer)) {}

  const std::shared_ptr<TransferableArrayBuffer> buffer;
};

// Wraps `buffer` in a real `jsi::ArrayBuffer` (zero-copy), tags it with
// `__transferable` so the serializer shares rather than copies it, and attaches
// the store as `NativeState` for later recovery.
jsi::Value makeTransferableArrayBuffer(jsi::Runtime &rt, std::shared_ptr<TransferableArrayBuffer> buffer);

// Recovers the shared store from a transferable `ArrayBuffer`, or `nullptr` if
// `object` is not one of ours.
std::shared_ptr<TransferableArrayBuffer> getTransferableArrayBufferStore(jsi::Runtime &rt, const jsi::Object &object);

} // namespace worklets
