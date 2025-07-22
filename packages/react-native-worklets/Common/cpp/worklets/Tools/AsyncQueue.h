#pragma once

#include <jsi/jsi.h>

#include <atomic>
#include <condition_variable>
#include <memory>
#include <queue>
#include <string>
#include <thread>
#include <utility>
#include <vector>

namespace worklets {

struct AsyncQueueState {
  std::atomic_bool running{true};
  std::mutex mutex;
  std::condition_variable cv;
  std::queue<std::function<void()>> queue;
};

class AsyncQueue : public facebook::jsi::NativeState {
 public:
  virtual ~AsyncQueue() = default;

  virtual void push(std::function<void()> &&job) = 0;
};

class AsyncQueueImpl : public AsyncQueue {
 public:
  explicit AsyncQueueImpl(std::string name);

  ~AsyncQueueImpl() override;

  void push(std::function<void()> &&job) override;

 private:
  const std::shared_ptr<AsyncQueueState> state_;
};

} // namespace worklets
