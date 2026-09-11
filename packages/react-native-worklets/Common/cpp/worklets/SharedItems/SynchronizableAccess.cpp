#include <worklets/SharedItems/SynchronizableAccess.h>

#include <mutex>
#include <thread>

namespace worklets {
void SynchronizableAccess::getBlockingBefore() {
  std::unique_lock<std::mutex> lock(accessLock_);
  queue_.wait(lock, [this]() {
    return !blockingWriter_ && dirtyWriters_ == 0 &&
        (!imperativelyLocked_ || imperativeOwner_ == std::this_thread::get_id());
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

void SynchronizableAccess::setDirtyBefore() {
  std::unique_lock<std::mutex> lock(accessLock_);
  queue_.wait(lock, [this]() {
    return !blockingWriter_ && blockingReaders_ == 0 &&
        (!imperativelyLocked_ || imperativeOwner_ == std::this_thread::get_id());
  });
  dirtyWriters_++;
}

void SynchronizableAccess::setDirtyAfter() {
  std::unique_lock<std::mutex> lock(accessLock_);
  dirtyWriters_--;
  if (dirtyWriters_ == 0) {
    queue_.notify_all();
  }
}

void SynchronizableAccess::setBlockingBefore() {
  std::unique_lock<std::mutex> lock(accessLock_);
  queue_.wait(lock, [this]() {
    return !blockingWriter_ && blockingReaders_ == 0 && dirtyWriters_ == 0 &&
        (!imperativelyLocked_ || imperativeOwner_ == std::this_thread::get_id());
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
    return !blockingWriter_ && blockingReaders_ == 0 && dirtyWriters_ == 0 &&
        (!imperativelyLocked_ || imperativeOwner_ == std::this_thread::get_id());
  });
  imperativelyLocked_ = true;
  imperativeOwner_ = std::this_thread::get_id();
}

void SynchronizableAccess::unlock() {
  std::unique_lock<std::mutex> lock(accessLock_);
  if (imperativeOwner_ != std::this_thread::get_id()) {
    return;
  }
  imperativelyLocked_ = false;
  imperativeOwner_ = {};
  queue_.notify_all();
}

} // namespace worklets
