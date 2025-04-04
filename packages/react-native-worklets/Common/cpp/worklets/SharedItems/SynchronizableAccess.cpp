#include <worklets/SharedItems/SynchronizableAccess.h>
#include <mutex>

namespace worklets {
auto SynchronizableAccess::getBlockingBefore() -> void {
  std::unique_lock<std::mutex> lock(accessLock_);
  queue_.wait(lock, [this]() {
    return !blockingWriter_ && dirtyWriters_ == 0 &&
        (!imperativelyLocked_ || imperativeOwner_ == pthread_self());
  });
  blockingReaders_++;
}

auto SynchronizableAccess::getBlockingAfter() -> void {
  std::unique_lock<std::mutex> lock(accessLock_);
  blockingReaders_--;
  if (blockingReaders_ == 0) {
    queue_.notify_all();
  }
}

auto SynchronizableAccess::setDirtyBefore() -> void {
  std::unique_lock<std::mutex> lock(accessLock_);
  queue_.wait(lock, [this]() {
    return !blockingWriter_ && blockingReaders_ == 0 &&
        (!imperativelyLocked_ || imperativeOwner_ == pthread_self());
  });
  dirtyWriters_++;
}

auto SynchronizableAccess::setDirtyAfter() -> void {
  std::unique_lock<std::mutex> lock(accessLock_);
  dirtyWriters_--;
  if (dirtyWriters_ == 0) {
    queue_.notify_all();
  }
}

auto SynchronizableAccess::setBlockingBefore() -> void {
  std::unique_lock<std::mutex> lock(accessLock_);
  queue_.wait(lock, [this]() {
    return !blockingWriter_ && blockingReaders_ == 0 && dirtyWriters_ == 0 &&
        (!imperativelyLocked_ || imperativeOwner_ == pthread_self());
  });
  blockingWriter_ = true;
}

auto SynchronizableAccess::setBlockingAfter() -> void {
  std::unique_lock<std::mutex> lock(accessLock_);
  blockingWriter_ = false;
  queue_.notify_all();
}

auto SynchronizableAccess::lock() -> void {
  std::unique_lock<std::mutex> lock(accessLock_);
  queue_.wait(lock, [this]() {
    return !blockingWriter_ && blockingReaders_ == 0 && dirtyWriters_ == 0 &&
        (!imperativelyLocked_ || imperativeOwner_ == pthread_self());
  });
  imperativelyLocked_ = true;
  imperativeOwner_ = pthread_self();
}

auto SynchronizableAccess::unlock() -> void {
  std::unique_lock<std::mutex> lock(accessLock_);
  if (imperativeOwner_ != pthread_self()) {
    return;
  }
  imperativelyLocked_ = false;
  imperativeOwner_ = {};
  queue_.notify_all();
}

} // namespace worklets
