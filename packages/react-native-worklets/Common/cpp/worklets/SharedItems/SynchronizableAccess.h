#pragma once

#include <condition_variable>
#include <mutex>

namespace worklets {

class SynchronizableAccess {
 public:
  auto lock() -> void;
  auto unlock() -> void;

 protected:
  auto getBlockingBefore() -> void;
  auto getBlockingAfter() -> void;

  auto setDirtyBefore() -> void;
  auto setDirtyAfter() -> void;

  auto setBlockingBefore() -> void;
  auto setBlockingAfter() -> void;

 private:
  int blockingReaders_{0};
  int dirtyWriters_{0};
  bool blockingWriter_{false};
  bool imperativelyLocked_{false};
  pthread_t imperativeOwner_{};
  std::mutex accessLock_;
  std::recursive_mutex imperativeLock_;
  std::condition_variable queue_;
};

} // namespace worklets
