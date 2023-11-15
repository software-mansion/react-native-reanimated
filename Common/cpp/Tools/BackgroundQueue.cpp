#include "BackgroundQueue.h"

#include <utility>

namespace reanimated {

BackgroundQueue::BackgroundQueue(const std::string &name) : name_(name) {
  auto thread = std::thread(&BackgroundQueue::runLoop, this);
#ifdef ANDROID
  pthread_setname_np(thread.native_handle(), name_.c_str());
#endif
  thread.detach();
}

BackgroundQueue::~BackgroundQueue() {
  running_ = false;
  cv_.notify_all();
}

void BackgroundQueue::push(std::function<void()> &&job) {
  std::unique_lock<std::mutex> lock(mutex_);
  queue_.emplace(job);
  cv_.notify_one();
}

void BackgroundQueue::runLoop() {
#if __APPLE__
  pthread_setname_np(name_.c_str());
#endif
  while (running_) {
    std::unique_lock<std::mutex> lock(mutex_);
    cv_.wait(lock, [this] { return !queue_.empty() || !running_; });
    if (!running_) {
      return;
    }
    if (!queue_.empty()) {
      auto job = std::move(queue_.front());
      queue_.pop();
      lock.unlock();
      job();
    }
  }
}

} // namespace reanimated
