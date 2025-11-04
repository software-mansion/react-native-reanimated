#include <worklets/SharedItems/SynchronizableAccess.h>

#include <mutex>

namespace worklets {
void SynchronizableAccess::getBlockingBefore() {
  std::unique_lock<std::mutex> lock(accessLock_);
  queue_.wait(lock, [this]() {
    return !blockingWriter_ /* && dirtyWriters_ == 0 */ && (!imperativelyLocked_ || imperativeOwner_ == pthread_self());
  });
  blockingReaders_++;
}

void SynchronizableAccess::getBlockingAfter() {
  std::unique_lock<std::mutex> lock(accessLock_);
  blockingReaders_--;
  if (blockingReaders_ == 0) {
    queue_.notify_all();
  }
}

// TODO: Shared pointer members (unless they're atomic) can't be assigned
// in a non thread-safe manner, therefore `setDirty` has little sense now.
// void SynchronizableAccess::setDirtyBefore() {
//   std::unique_lock<std::mutex> lock(accessLock_);
//   queue_.wait(lock, [this]() {
//     return !blockingWriter_ && blockingReaders_ == 0 &&
//         (!imperativelyLocked_ || imperativeOwner_ == pthread_self());
//   });
//   dirtyWriters_++;
// }

// TODO: Shared pointer members (unless they're atomic) can't be assigned
// in a non thread-safe manner, therefore `setDirty` has little sense now.
// void SynchronizableAccess::setDirtyAfter() {
//   std::unique_lock<std::mutex> lock(accessLock_);
//   dirtyWriters_--;
//   if (dirtyWriters_ == 0) {
//     queue_.notify_all();
//   }
// }

void SynchronizableAccess::setBlockingBefore() {
  std::unique_lock<std::mutex> lock(accessLock_);
  queue_.wait(lock, [this]() {
    return !blockingWriter_ && blockingReaders_ == 0 /* && dirtyWriters_ == 0 */ &&
        (!imperativelyLocked_ || imperativeOwner_ == pthread_self());
  });
  blockingWriter_ = true;
}

void SynchronizableAccess::setBlockingAfter() {
  std::unique_lock<std::mutex> lock(accessLock_);
  blockingWriter_ = false;
  queue_.notify_all();
}

void SynchronizableAccess::lock() {
  std::unique_lock<std::mutex> lock(accessLock_);
  queue_.wait(lock, [this]() {
    return !blockingWriter_ && blockingReaders_ == 0 /* && dirtyWriters_ == 0 */ &&
        (!imperativelyLocked_ || imperativeOwner_ == pthread_self());
  });
  imperativelyLocked_ = true;
  imperativeOwner_ = pthread_self();
}

void SynchronizableAccess::unlock() {
  std::unique_lock<std::mutex> lock(accessLock_);
  if (imperativeOwner_ != pthread_self()) {
    return;
  }
  imperativelyLocked_ = false;
  imperativeOwner_ = {};
  queue_.notify_all();
}

} // namespace worklets
