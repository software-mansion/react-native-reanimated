#pragma once

#include <condition_variable>
#include <mutex>

namespace worklets {

class SynchronizableAccess {
 public:
  /**
   * Allows you to imperatively lock the synchronizable to perform a
   * transaction.
   */
  void lock();

  /**
   * Unlocks the synchronizable after an imperative lock when the transaction is
   * complete.
   */
  void unlock();

 protected:
  void getBlockingBefore();
  void getBlockingAfter();

  // TODO: Shared pointer members (unless they're atomic) can't be assigned
  // in a non thread-safe manner, therefore `setDirty` has little sense now.
  // void setDirtyBefore();
  // void setDirtyAfter();

  void setBlockingBefore();
  void setBlockingAfter();

 private:
  int blockingReaders_{0};
  // int dirtyWriters_{0};
  bool blockingWriter_{false};
  bool imperativelyLocked_{false};
  pthread_t imperativeOwner_{};
  std::mutex accessLock_;
  std::recursive_mutex imperativeLock_;
  std::condition_variable queue_;
};

} // namespace worklets
